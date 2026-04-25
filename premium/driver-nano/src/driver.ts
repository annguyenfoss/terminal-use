import { basename, dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ActionResult, Driver, DriverIO } from '@project-gateway/driver-kit'

import {
  NANO_DRIVER_ID,
  type NanoAnchorDirection,
  type NanoBufferTarget,
  type NanoCapabilities,
  type NanoExecuteCommandOptions,
  type NanoExitOptions,
  type NanoLocateQuery,
  type NanoOpenFileOptions,
  type NanoPromptKind,
  type NanoReplaceOptions,
  type NanoSaveAsOptions,
  type NanoSearchOptions,
  type NanoState
} from './types.js'
import {
  getNanoCapabilities,
  locateNanoElements,
  matchesNanoSnapshot,
  parseNanoState
} from './parse.js'

type NanoDriverInstance = Driver<NanoState, NanoCapabilities>

export function createNanoDriver(): NanoDriverInstance {
  return {
    id: NANO_DRIVER_ID,
    version: '0.5.0-alpha',
    detect(snapshot) {
      return matchesNanoSnapshot(snapshot) ? 1 : 0
    },
    capabilities() {
      return getNanoCapabilities()
    },
    parse(snapshot) {
      return parseNanoState(snapshot)
    },
    locate(state, query) {
      return locateNanoElements(state, parseLocateQuery(query))
    },
    async invoke(action, _state, io) {
      const request = parseActionRequest(action)

      switch (request.name) {
        case 'insert':
          return ok(await insertText(io, parseRequiredTextArg(request.args, 'insert')))
        case 'save':
          return ok(await save(io))
        case 'saveAs': {
          const { path, options } = parseSaveAsArgs(request.args)
          return ok(await saveAs(io, path, options))
        }
        case 'search': {
          const { query, options } = parseSearchArgs(request.args, 'search')
          return ok(await search(io, query, options))
        }
        case 'replace': {
          const { find, replacement, options } = parseReplaceArgs(request.args)
          return ok(await replace(io, find, replacement, options))
        }
        case 'toggleMark':
          return ok(await toggleMark(io))
        case 'copySelection':
          return ok(await copySelection(io))
        case 'cutSelection':
          return ok(await cutSelection(io))
        case 'paste':
          return ok(await paste(io))
        case 'undo':
          return ok(await undo(io))
        case 'redo':
          return ok(await redo(io))
        case 'openHelp':
          return ok(await openHelp(io))
        case 'closeHelp':
          return ok(await closeHelp(io))
        case 'openFile':
          return ok(
            await openFile(
              io,
              parsePathArg(request.args, 'openFile'),
              parseOpenFileOptions(request.args)
            )
          )
        case 'executeCommand': {
          const { command, options } = parseExecuteArgs(request.args)
          return ok(await executeCommand(io, command, options))
        }
        case 'runSpeller':
          return ok(await runSpeller(io))
        case 'runFormatter':
          return ok(await runFormatter(io))
        case 'runLinter':
          return ok(await runLinter(io))
        case 'jumpNextLint':
          return ok(await jumpLint(io, 'next'))
        case 'jumpPrevLint':
          return ok(await jumpLint(io, 'prev'))
        case 'recordMacro':
          return ok(await recordMacro(io))
        case 'playMacro':
          return ok(await playMacro(io))
        case 'placeAnchor':
          return ok(await placeAnchor(io))
        case 'jumpAnchor':
          return ok(await jumpAnchor(io, parseAnchorDirection(request.args)))
        case 'switchBuffer':
          return ok(await switchBuffer(io, parseBufferTarget(request.args)))
        case 'exit':
          return okNullable(await exitNano(io, parseExitOptions(request.args)))
        default:
          return {
            ok: false,
            error: {
              message: `Unknown nano action: ${request.name}`
            }
          }
      }
    }
  }
}

async function insertText(io: DriverIO, text: string): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'insert')

  const baseline = io.getSnapshot().revision
  await io.type(text.replace(/\r?\n/gu, '\r'))

  return waitForState(
    io,
    (state, revision) => revision > baseline && state.mode === 'editor',
    'editor text insertion'
  )
}

async function save(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'save')
  const promptState = await openPrompt(io, 'Ctrl+O', ['writeOut'], 'write-out prompt')

  if (!promptState.prompt?.input) {
    throw new Error('save() requires an existing file name; use saveAs() first')
  }

  const baseline = io.getSnapshot().revision
  await io.press('Enter')

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline && state.mode === 'editor' && !state.modified,
    'save completion'
  )
}

async function saveAs(
  io: DriverIO,
  path: string,
  options: NanoSaveAsOptions = {}
): Promise<NanoState> {
  if (options.viaBrowser) {
    throw new Error('saveAs() viaBrowser is not implemented in Phase 5')
  }

  await openPrompt(io, 'Ctrl+O', ['writeOut'], 'write-out prompt')
  await replacePromptInput(io, 'writeOut', path)
  const baseline = io.getSnapshot().revision
  await io.press('Enter')

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline &&
      state.mode === 'editor' &&
      !state.modified &&
      state.fileName !== null,
    'save-as completion'
  )
}

async function search(
  io: DriverIO,
  query: string,
  options: NanoSearchOptions = {}
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'search')

  await openPrompt(io, 'Ctrl+W', ['search'], 'search prompt')
  await applySearchOptions(io, 'search', options)
  await typeIntoPrompt(io, 'search', query)
  const baseline = io.getSnapshot().revision
  await io.press('Enter')

  return waitForState(
    io,
    (state, revision) => revision > baseline && state.mode === 'editor',
    'search completion'
  )
}

async function replace(
  io: DriverIO,
  find: string,
  replacement: string,
  options: NanoReplaceOptions = {}
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'replace')

  await typeControl(io, '\x1c')
  await waitForState(
    io,
    (state) => state.mode === 'replace',
    'replace search prompt'
  )
  await applySearchOptions(io, 'replace', options)
  await typeIntoPrompt(io, 'replace', find)
  const replacePromptBaseline = io.getSnapshot().revision
  await io.press('Enter')
  await waitForState(
    io,
    (state, revision) => revision > replacePromptBaseline && state.mode === 'replaceWith',
    'replace-with prompt'
  )
  await replacePromptInput(io, 'replaceWith', replacement)
  const confirmBaseline = io.getSnapshot().revision
  await io.press('Enter')

  const confirm = await waitForState(
    io,
    (state, revision) => revision > confirmBaseline && state.mode === 'yesNo',
    'replace confirmation'
  )

  if (!confirm.prompt?.text.startsWith('Replace this instance?')) {
    throw new Error('replace() did not reach the replace confirmation prompt')
  }

  const replyBaseline = io.getSnapshot().revision
  await io.type(options.all ? 'A' : 'Y')
  const next = await waitForState(
    io,
    (state, revision) =>
      revision > replyBaseline && (state.mode === 'editor' || state.mode === 'yesNo'),
    'replace continuation'
  )

  if (options.all || next.mode === 'editor') {
    return next
  }

  const cancelBaseline = io.getSnapshot().revision
  await typeControl(io, '\x03')

  return waitForState(
    io,
    (state, revision) => revision > cancelBaseline && state.mode === 'editor',
    'replace cancellation'
  )
}

async function toggleMark(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'toggleMark')
  const expected = !current.markActive
  const baseline = io.getSnapshot().revision
  await io.press('Ctrl+6')

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline && state.mode === 'editor' && state.markActive === expected,
    'mark toggle'
  )
}

async function copySelection(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMarked(current, 'copySelection')
  const baseline = io.getSnapshot().revision
  await pressMeta(io, '6')

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline && state.mode === 'editor' && !state.markActive,
    'selection copy'
  )
}

async function cutSelection(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMarked(current, 'cutSelection')
  const baseline = io.getSnapshot().revision
  await io.press('Ctrl+K')

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline && state.mode === 'editor' && !state.markActive,
    'selection cut'
  )
}

async function paste(io: DriverIO): Promise<NanoState> {
  return runEditorCommand(io, () => io.press('Ctrl+U'), 'paste')
}

async function undo(io: DriverIO): Promise<NanoState> {
  return runEditorCommand(io, () => pressMeta(io, 'u'), 'undo')
}

async function redo(io: DriverIO): Promise<NanoState> {
  return runEditorCommand(io, () => pressMeta(io, 'e'), 'redo')
}

async function openHelp(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'openHelp')
  return openPrompt(io, 'Ctrl+G', ['help'], 'help view')
}

async function closeHelp(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['help'], 'closeHelp')
  return openPrompt(io, 'Ctrl+X', ['editor'], 'editor view')
}

async function openFile(
  io: DriverIO,
  path: string,
  options: NanoOpenFileOptions
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'openFile')

  await openPrompt(io, 'Ctrl+R', ['readFile'], 'read-file prompt')

  if (options.viaBrowser) {
    await openPrompt(io, 'Ctrl+T', ['browser'], 'file browser')
    const browserState = readState(io)
    const target = resolveTargetPath(path, browserState.browser?.cwd)

    if (normalizeDirectory(browserState.browser?.cwd) !== normalizeDirectory(target.dir)) {
      const promptState = await openPrompt(
        io,
        'Ctrl+/',
        ['browser'],
        'browser directory prompt',
        (state) => state.prompt?.kind === 'goToDirectory'
      )
      await replacePromptInput(io, promptState.prompt?.kind ?? 'goToDirectory', target.dir)
      const baseline = io.getSnapshot().revision
      await io.press('Enter')
      await waitForState(
        io,
        (state, revision) =>
          revision > baseline &&
          state.mode === 'browser' &&
          (state.browser?.cwd ?? '') === target.dir,
        'browser directory change'
      )
    }

    await selectBrowserEntry(io, target.base)
    const baseline = io.getSnapshot().revision
    await io.press('Enter')
    const afterBrowser = await waitForState(
      io,
      (state, revision) =>
        revision > baseline &&
        (state.mode === 'readFile' || state.mode === 'editor'),
      'browser selection return'
    )

    if (afterBrowser.mode === 'editor') {
      return afterBrowser
    }
  } else {
    await typeIntoPrompt(io, 'readFile', path)
  }

  const baseline = io.getSnapshot().revision
  await io.press('Enter')

  return waitForState(
    io,
    (state, revision) => revision > baseline && state.mode === 'editor',
    'file open completion'
  )
}

async function executeCommand(
  io: DriverIO,
  command: string,
  options: NanoExecuteCommandOptions = {}
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'executeCommand')
  let promptState = await openExecutePrompt(io, 'executeCommand')

  if (options.pipe && promptState.prompt?.text.toLowerCase().includes('new buffer')) {
    const toggleBaseline = io.getSnapshot().revision
    await pressMeta(io, 'F')
    promptState = await waitForState(
      io,
      (state, revision) =>
        revision > toggleBaseline &&
        state.prompt?.kind === 'execute' &&
        !state.prompt.text.toLowerCase().includes('new buffer'),
      'execute target buffer toggle'
    )
  }

  await replacePromptInput(io, 'execute', options.pipe ? `|${command}` : command)
  const baseline = io.getSnapshot().revision
  await io.press('Enter')

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline &&
      state.mode === 'editor' &&
      state.prompt === null &&
      state.statusMessage !== 'Executing...',
    'execute completion'
  )
}

async function runSpeller(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'runSpeller')
  const script = fileURLToPath(new URL('../runtime/speller.mjs', import.meta.url))
  const state = await executeCommand(
    io,
    `${JSON.stringify(process.execPath)} ${JSON.stringify(script)}`,
    {
      pipe: true
    }
  )

  if (
    state.mode !== 'editor' ||
    !state.visibleText.some((line) => line.includes('omega'))
  ) {
    throw unavailableFlow('spell checker', state)
  }

  return state
}

async function runFormatter(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'runFormatter')
  const baseline = io.getSnapshot().revision
  await pressMeta(io, 'F')
  const state = await waitForState(
    io,
    (next, revision) =>
      revision > baseline &&
      next.mode === 'editor' &&
      next.statusMessage !== 'Invoking formatter...',
    'formatter completion',
    4_000
  )

  if (state.mode !== 'editor' || state.statusMessage !== 'Buffer has been processed') {
    throw unavailableFlow('formatter', state)
  }

  return state
}

async function runLinter(io: DriverIO): Promise<NanoState> {
  await openExecutePrompt(io, 'runLinter')
  const baseline = io.getSnapshot().revision
  await io.type('\x19')
  const state = await waitForState(
    io,
    (next, revision) =>
      revision > baseline &&
      (next.mode === 'linter' || next.statusMessage !== 'Invoking linter...'),
    'linter completion',
    4_000
  )

  if (state.mode !== 'linter') {
    throw unavailableFlow('linter', state)
  }

  return state
}

async function jumpLint(
  io: DriverIO,
  direction: 'next' | 'prev'
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['linter'], `jump${direction === 'next' ? 'Next' : 'Prev'}Lint`)
  const baseline = io.getSnapshot().revision
  await io.type(direction === 'next' ? '\x16' : '\x19')
  return waitForPossibleChange(io, baseline, 'linter navigation')
}

async function recordMacro(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'recordMacro')
  const expected = !current.macroRecording
  const baseline = io.getSnapshot().revision
  await pressMeta(io, ':')

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline && state.mode === 'editor' && state.macroRecording === expected,
    expected ? 'macro recording start' : 'macro recording stop'
  )
}

async function playMacro(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'playMacro')
  const baseline = io.getSnapshot().revision
  await pressMeta(io, ';')
  return waitForPossibleChange(io, baseline, 'macro playback')
}

async function placeAnchor(io: DriverIO): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'placeAnchor')
  const baseline = io.getSnapshot().revision
  await pressMeta(io, "'")

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline &&
      state.mode === 'editor' &&
      state.anchorLines.length >= current.anchorLines.length,
    'anchor placement'
  )
}

async function jumpAnchor(
  io: DriverIO,
  direction: NanoAnchorDirection
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'jumpAnchor')
  const baseline = io.getSnapshot().revision
  await pressMeta(io, direction === 'next' ? 'N' : 'P')
  return waitForPossibleChange(io, baseline, 'anchor navigation')
}

async function switchBuffer(
  io: DriverIO,
  target: NanoBufferTarget
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], 'switchBuffer')

  if (!current.bufferCount || current.bufferCount < 2) {
    throw new Error('switchBuffer requires multiple open buffers')
  }

  if (target === 'next' || target === 'prev') {
    return jumpBuffer(io, current, target)
  }

  if (!Number.isInteger(target) || target < 1 || target > current.bufferCount) {
    throw new Error(`switchBuffer target must be between 1 and ${current.bufferCount}`)
  }

  if (!current.bufferIndex || current.bufferIndex === target) {
    return current
  }

  const direction = target > current.bufferIndex ? 'next' : 'prev'
  let state = current

  while (state.bufferIndex !== target) {
    state = await jumpBuffer(io, state, direction)
  }

  return state
}

async function exitNano(
  io: DriverIO,
  options: NanoExitOptions = {}
): Promise<NanoState | null> {
  const current = readState(io)

  if (current.mode === 'help' || current.mode === 'browser') {
    const baseline = io.getSnapshot().revision
    await io.press('Ctrl+X')
    return waitForPossibleChange(io, baseline, 'help or browser exit')
  }

  if (current.mode === 'linter') {
    const baseline = io.getSnapshot().revision
    await io.press('Enter')
    return waitForPossibleChange(io, baseline, 'linter exit')
  }

  assertMode(current, ['editor'], 'exit')
  const baseline = io.getSnapshot().revision
  await io.press('Ctrl+X')
  const next = await waitForState(
    io,
    (state, revision) =>
      revision > baseline && (state.mode === 'editor' || state.mode === 'yesNo'),
    'exit transition'
  )

  if (next.mode !== 'yesNo') {
    return next
  }

  if (!next.prompt?.text.startsWith('Save modified buffer?')) {
    return next
  }

  const choice = options.save ?? 'cancel'
  const choiceBaseline = io.getSnapshot().revision

  if (choice === 'cancel') {
    await typeControl(io, '\x03')
    return waitForPossibleChange(io, choiceBaseline, 'exit cancellation')
  }

  await io.type(choice === 'yes' ? 'Y' : 'N')
  return waitForPossibleChange(io, choiceBaseline, 'exit confirmation')
}

async function jumpBuffer(
  io: DriverIO,
  current: NanoState,
  direction: 'next' | 'prev'
): Promise<NanoState> {
  const baseline = io.getSnapshot().revision
  await pressMeta(io, direction === 'next' ? '>' : '<')

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline &&
      state.mode === 'editor' &&
      state.bufferIndex !== current.bufferIndex,
    `${direction} buffer switch`
  )
}

async function openExecutePrompt(
  io: DriverIO,
  actionName: string
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], actionName)
  return openPrompt(io, 'Ctrl+T', ['execute'], 'execute prompt')
}

async function runEditorCommand(
  io: DriverIO,
  command: () => Promise<void>,
  description: string
): Promise<NanoState> {
  const current = readState(io)
  assertMode(current, ['editor'], description)
  const baseline = io.getSnapshot().revision
  await command()
  return waitForPossibleChange(io, baseline, description)
}

async function applySearchOptions(
  io: DriverIO,
  promptKind: NanoPromptKind,
  options: NanoSearchOptions | NanoReplaceOptions
): Promise<NanoState> {
  let state = readState(io)

  if (options.backwards) {
    state = await togglePromptOption(io, promptKind, 'b', 'backwards search')
  }

  if (options.caseSensitive) {
    state = await togglePromptOption(io, promptKind, 'c', 'case-sensitive search')
  }

  if (options.regex) {
    state = await togglePromptOption(io, promptKind, 'r', 'regular-expression search')
  }

  return state
}

async function togglePromptOption(
  io: DriverIO,
  promptKind: NanoPromptKind,
  key: string,
  description: string
): Promise<NanoState> {
  const baseline = io.getSnapshot().revision
  await pressMeta(io, key)

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline && state.prompt?.kind === promptKind,
    description
  )
}

async function selectBrowserEntry(io: DriverIO, fileName: string): Promise<NanoState> {
  let current = readState(io)
  assertMode(current, ['browser'], 'selectBrowserEntry')
  const targetIndex = findBrowserEntryIndex(current, fileName)

  if (targetIndex === null || current.browser?.selectedIndex === null) {
    throw new Error(`Unable to find browser entry: ${fileName}`)
  }

  while ((current.browser?.selectedIndex ?? -1) !== targetIndex) {
    const direction =
      (current.browser?.selectedIndex ?? 0) < targetIndex ? 'Down' : 'Up'

    const baseline = io.getSnapshot().revision
    await io.press(direction)
    current = await waitForState(
      io,
      (state, revision) => revision > baseline && state.mode === 'browser',
      'browser selection movement'
    )
  }

  return current
}

async function typeIntoPrompt(
  io: DriverIO,
  expectedKind: NanoPromptKind,
  value: string
): Promise<NanoState> {
  if (value.length === 0) {
    return readState(io)
  }

  const baseline = io.getSnapshot().revision
  await io.type(value)

  await waitForState(
    io,
    (state, revision) => revision > baseline && state.prompt?.kind === expectedKind,
    `${expectedKind} prompt update`
  )

  while (true) {
    const revision = io.getSnapshot().revision
    const settled = await waitForPossibleChange(io, revision, `${expectedKind} prompt settle`, 100)
    const nextRevision = io.getSnapshot().revision

    if (nextRevision === revision || settled.prompt?.kind !== expectedKind) {
      return settled
    }

  }
}

async function replacePromptInput(
  io: DriverIO,
  expectedKind: NanoPromptKind,
  value: string
): Promise<NanoState> {
  const current = readState(io)
  const existing = current.prompt?.input ?? ''

  if (existing.length > 0) {
    const baseline = io.getSnapshot().revision

    for (let index = 0; index < existing.length; index += 1) {
      await io.press('Backspace')
    }

    await waitForState(
      io,
      (state, revision) =>
        revision > baseline &&
        state.prompt?.kind === expectedKind &&
        (state.prompt.input ?? '').length === 0,
      `${expectedKind} prompt clear`
    )
  }

  return typeIntoPrompt(io, expectedKind, value)
}

async function openPrompt(
  io: DriverIO,
  key: string,
  expectedModes: readonly NanoState['mode'][],
  description: string,
  predicate?: (state: NanoState) => boolean
): Promise<NanoState> {
  const baseline = io.getSnapshot().revision
  await io.press(key)

  return waitForState(
    io,
    (state, revision) =>
      revision > baseline &&
      expectedModes.includes(state.mode) &&
      (predicate ? predicate(state) : true),
    description
  )
}

async function waitForState(
  io: DriverIO,
  predicate: (state: NanoState, revision: number) => boolean,
  description: string,
  timeout = 4_000
): Promise<NanoState> {
  const deadline = Date.now() + timeout
  let snapshot = io.getSnapshot()
  let state = parseNanoState(snapshot)

  while (true) {
    if (predicate(state, snapshot.revision)) {
      return state
    }

    const remaining = deadline - Date.now()

    if (remaining <= 0) {
      throw new Error(timeoutMessage(description, state))
    }

    await io.waitForChange({
      timeout: remaining
    })
    snapshot = io.getSnapshot()
    state = parseNanoState(snapshot)
  }
}

async function waitForPossibleChange(
  io: DriverIO,
  baseline: number,
  description: string,
  timeout = 750
): Promise<NanoState> {
  try {
    return await waitForState(
      io,
      (_state, revision) => revision > baseline,
      description,
      timeout
    )
  } catch {
    return readState(io)
  }
}

function timeoutMessage(description: string, state: NanoState): string {
  const suffix = state.statusMessage
    ? ` (status: ${state.statusMessage})`
    : state.prompt
      ? ` (prompt: ${state.prompt.text})`
      : ''

  return `Timed out waiting for ${description}${suffix}`
}

function readState(io: DriverIO): NanoState {
  return parseNanoState(io.getSnapshot())
}

function parseLocateQuery(query: unknown): NanoLocateQuery | undefined {
  if (!query || typeof query !== 'object') {
    return undefined
  }

  const { role, text } = query as Record<string, unknown>
  const next: NanoLocateQuery = {}

  if (typeof role === 'string' && role.length > 0) {
    next.role = role
  }

  if (typeof text === 'string' || text instanceof RegExp) {
    next.text = text
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function parseActionRequest(value: unknown): { name: string; args: unknown } {
  if (!value || typeof value !== 'object') {
    throw new Error('nano action payload must be an object')
  }

  const { name, args } = value as Record<string, unknown>

  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('nano action name must be a non-empty string')
  }

  return {
    name,
    args
  }
}

function parseRequiredTextArg(args: unknown, name: string): string {
  if (typeof args === 'string' && args.length > 0) {
    return args
  }

  if (args && typeof args === 'object' && typeof (args as { text?: unknown }).text === 'string') {
    const value = (args as { text: string }).text

    if (value.length > 0) {
      return value
    }
  }

  if (args && typeof args === 'object' && typeof (args as { query?: unknown }).query === 'string') {
    const value = (args as { query: string }).query

    if (value.length > 0) {
      return value
    }
  }

  throw new Error(`${name} requires a non-empty text value`)
}

function parseSearchArgs(
  args: unknown,
  name: string
): {
  query: string
  options: NanoSearchOptions
} {
  if (typeof args === 'string') {
    return {
      query: args,
      options: {}
    }
  }

  if (!args || typeof args !== 'object') {
    throw new Error(`${name} requires a query string`)
  }

  return {
    query: parseRequiredTextArg(args, name),
    options: parseSearchOptions(args)
  }
}

function parseReplaceArgs(args: unknown): {
  find: string
  replacement: string
  options: NanoReplaceOptions
} {
  if (!args || typeof args !== 'object') {
    throw new Error('replace requires { find, replacement }')
  }

  const find = parseRequiredTextArg({ text: (args as { find?: unknown }).find }, 'replace')
  const replacement =
    typeof (args as { replacement?: unknown }).replacement === 'string'
      ? (args as { replacement: string }).replacement
      : typeof (args as { with?: unknown }).with === 'string'
        ? (args as { with: string }).with
        : null

  if (replacement === null) {
    throw new Error('replace requires a replacement string')
  }

  return {
    find,
    replacement,
    options: {
      ...parseSearchOptions(args),
      all: Boolean((args as { all?: unknown }).all)
    }
  }
}

function parseSearchOptions(args: unknown): NanoSearchOptions {
  if (!args || typeof args !== 'object') {
    return {}
  }

  return {
    backwards: Boolean((args as { backwards?: unknown }).backwards),
    caseSensitive: Boolean((args as { caseSensitive?: unknown }).caseSensitive),
    regex: Boolean((args as { regex?: unknown }).regex)
  }
}

function parseSaveAsArgs(args: unknown): {
  path: string
  options: NanoSaveAsOptions
} {
  if (typeof args === 'string') {
    return {
      path: args,
      options: {}
    }
  }

  return {
    path: parsePathArg(args, 'saveAs'),
    options: {
      viaBrowser: Boolean((args as { viaBrowser?: unknown })?.viaBrowser)
    }
  }
}

function parsePathArg(args: unknown, name: string): string {
  if (typeof args === 'string' && args.trim().length > 0) {
    return args
  }

  if (args && typeof args === 'object' && typeof (args as { path?: unknown }).path === 'string') {
    const value = (args as { path: string }).path

    if (value.trim().length > 0) {
      return value
    }
  }

  throw new Error(`${name} requires a non-empty path`)
}

function parseOpenFileOptions(args: unknown): NanoOpenFileOptions {
  if (!args || typeof args !== 'object') {
    return {}
  }

  return {
    viaBrowser: Boolean((args as { viaBrowser?: unknown }).viaBrowser)
  }
}

function parseExecuteArgs(args: unknown): {
  command: string
  options: NanoExecuteCommandOptions
} {
  if (typeof args === 'string') {
    return {
      command: args,
      options: {}
    }
  }

  if (!args || typeof args !== 'object') {
    throw new Error('executeCommand requires a command string')
  }

  const command =
    typeof (args as { command?: unknown }).command === 'string'
      ? (args as { command: string }).command
      : parseRequiredTextArg(args, 'executeCommand')

  return {
    command,
    options: {
      pipe: Boolean((args as { pipe?: unknown }).pipe)
    }
  }
}

function parseAnchorDirection(args: unknown): NanoAnchorDirection {
  if (args === 'next' || args === 'prev') {
    return args
  }

  if (args && typeof args === 'object' && ((args as { direction?: unknown }).direction === 'next' || (args as { direction?: unknown }).direction === 'prev')) {
    return (args as { direction: NanoAnchorDirection }).direction
  }

  throw new Error('jumpAnchor requires direction "prev" or "next"')
}

function parseBufferTarget(args: unknown): NanoBufferTarget {
  if (args === 'next' || args === 'prev' || typeof args === 'number') {
    return args as NanoBufferTarget
  }

  if (!args || typeof args !== 'object') {
    throw new Error('switchBuffer requires "prev", "next", or a buffer index')
  }

  const target = (args as { target?: unknown }).target

  if (target === 'next' || target === 'prev' || typeof target === 'number') {
    return target as NanoBufferTarget
  }

  throw new Error('switchBuffer requires "prev", "next", or a buffer index')
}

function parseExitOptions(args: unknown): NanoExitOptions {
  if (!args || typeof args !== 'object') {
    return {}
  }

  const save = (args as { save?: unknown }).save

  if (save === undefined || save === 'yes' || save === 'no' || save === 'cancel') {
    return {
      save
    }
  }

  throw new Error('exit save option must be "yes", "no", or "cancel"')
}

function resolveTargetPath(targetPath: string, cwd?: string | null): {
  dir: string
  base: string
} {
  const absolute = isAbsolute(targetPath)
    ? targetPath
    : resolve(cwd ?? process.cwd(), targetPath)

  return {
    dir: dirname(absolute),
    base: basename(absolute)
  }
}

function normalizeDirectory(value: string | null | undefined): string {
  return value ? resolve(value) : ''
}

function findBrowserEntryIndex(state: NanoState, fileName: string): number | null {
  const entries = state.browser?.entries ?? []
  const index = entries.findIndex((entry) => matchesBrowserCandidate(entry.text, fileName))
  return index === -1 ? null : index
}

function matchesBrowserCandidate(
  candidate: string | null | undefined,
  fileName: string
): boolean {
  if (!candidate) {
    return false
  }

  const normalized = candidate.trim()

  if (normalized.includes(fileName)) {
    return true
  }

  const leading = normalized.split(/\s{2,}/u)[0]?.trim() ?? normalized

  return fileName.startsWith(leading) || leading.startsWith(fileName)
}

function assertMode(
  state: NanoState,
  allowedModes: readonly NanoState['mode'][],
  actionName: string
): void {
  if (!allowedModes.includes(state.mode)) {
    throw new Error(
      `${actionName} requires mode ${allowedModes.join(' or ')}, got ${state.mode}`
    )
  }
}

function assertMarked(state: NanoState, actionName: string): void {
  if (!state.markActive) {
    throw new Error(`${actionName} requires an active mark/selection`)
  }
}

function unavailableFlow(feature: string, state: NanoState): Error {
  return new Error(
    state.statusMessage
      ? `nano ${feature} is unavailable: ${state.statusMessage}`
      : `nano ${feature} is unavailable in the current session`
  )
}

async function pressMeta(io: DriverIO, key: string): Promise<void> {
  await io.type(`\x1b${key}`)
}

async function typeControl(io: DriverIO, value: string): Promise<void> {
  await io.type(value)
}

function ok(state: NanoState): ActionResult {
  return {
    ok: true,
    value: state
  }
}

function okNullable(state: NanoState | null): ActionResult {
  return {
    ok: true,
    value: state
  }
}
