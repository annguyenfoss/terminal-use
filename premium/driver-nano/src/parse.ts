import {
  createBox,
  createElement,
  type TextQuery
} from '@terminal-use/driver-kit'
import type { Cell, Element, ScreenSnapshot } from '@terminal-use/protocol'

import {
  NANO_SUPPORTED_VERSION,
  type NanoBrowserEntry,
  type NanoBrowserState,
  type NanoCapabilities,
  type NanoLocateQuery,
  type NanoMode,
  type NanoPrompt,
  type NanoPromptKind,
  type NanoRegions,
  type NanoShortcut,
  type NanoState
} from './types.js'

const BASE_CAPABILITIES: NanoCapabilities = {
  version: NANO_SUPPORTED_VERSION,
  helpViewer: true,
  fileBrowser: true,
  managedProfile: true,
  multibuffer: true,
  speller: true,
  formatter: true,
  linter: true,
  macros: true,
  anchors: true,
  restrictedMode: false,
  readOnly: false
}

export function matchesNanoSnapshot(snapshot: ScreenSnapshot): boolean {
  const title = getLine(snapshot, 0).trim()
  const footer = [getLine(snapshot, snapshot.rows - 2), getLine(snapshot, snapshot.rows - 1)]
    .join(' ')
    .trim()

  return (
    title.includes('GNU nano') ||
    title.startsWith('DIR:') ||
    title.includes('Main nano help text') ||
    title.startsWith('Linting --') ||
    /^\[\d+\/\d+\]/u.test(title) ||
    footer.includes('Write Out') ||
    footer.includes('Previous Linter message')
  )
}

export function getNanoCapabilities(): NanoCapabilities {
  return {
    ...BASE_CAPABILITIES
  }
}

export function parseNanoState(snapshot: ScreenSnapshot): NanoState {
  const regions = buildRegions(snapshot)
  const titleBar = stripTrailingWhitespace(getLine(snapshot, 0))
  const statusBar = stripTrailingWhitespace(getLine(snapshot, snapshot.rows - 3))
  const helpShortcuts = parseHelpShortcuts(snapshot)
  const prompt = parsePrompt(statusBar, helpShortcuts)
  const title = parseTitleBar(titleBar)
  const mode = parseMode(titleBar, prompt)
  const browser = mode === 'browser' ? parseBrowser(snapshot, titleBar) : null

  return {
    version: title.version,
    mode,
    fileName: title.fileName,
    modified: title.modified,
    statusMessage: parseStatusMessage(statusBar),
    markActive: title.flags.has('M'),
    macroRecording: title.flags.has('R'),
    bufferIndex: title.bufferIndex,
    bufferCount: title.bufferCount,
    anchorLines: parseAnchorLines(snapshot),
    titleBar,
    statusBar,
    prompt,
    browser,
    visibleText: snapshot.plainTextLines
      .slice(1, Math.max(1, snapshot.rows - 3))
      .map(stripTrailingWhitespace),
    helpShortcuts,
    capabilities: getNanoCapabilities(),
    regions
  }
}

export function buildNanoElements(state: NanoState): Element[] {
  const elements: Element[] = [
    createElement({
      id: 'title',
      role: 'titleBar',
      text: state.titleBar,
      box: state.regions.titleBar
    }),
    createElement({
      id: 'status',
      role: 'statusBar',
      text: state.statusBar,
      box: state.regions.statusBar
    }),
    createElement({
      id: 'viewport',
      role: 'editorViewport',
      text: state.visibleText.join('\n'),
      box: state.regions.editViewport
    })
  ]

  if (state.bufferIndex && state.bufferCount) {
    elements.push(
      createElement({
        id: 'buffer',
        role: 'bufferIndicator',
        text: `[${state.bufferIndex}/${state.bufferCount}]`,
        box: createBox(0, 0, 8)
      })
    )
  }

  if (state.prompt) {
    elements.push(
      createElement({
        id: 'prompt',
        role: 'prompt',
        name: state.prompt.kind,
        text: [
          state.prompt.text,
          state.prompt.input ? ` ${state.prompt.input}` : ''
        ].join('').trim(),
        box: state.regions.statusBar
      })
    )
  }

  if (state.statusMessage) {
    elements.push(
      createElement({
        id: 'message',
        role: 'statusMessage',
        text: state.statusMessage,
        box: state.regions.statusBar
      })
    )
  }

  state.helpShortcuts.forEach((shortcut, index) => {
    elements.push(
      createElement({
        id: `shortcut:${index}`,
        role: 'helpShortcut',
        name: shortcut.label,
        text: `${shortcut.key} ${shortcut.label}`,
        box: shortcut.box
      })
    )
  })

  state.anchorLines.forEach((lineNumber, index) => {
    elements.push(
      createElement({
        id: `anchor:${index}`,
        role: 'anchor',
        text: String(lineNumber),
        box: createBox(0, lineNumber, 2)
      })
    )
  })

  state.browser?.entries.forEach((entry, index) => {
    elements.push(
      createElement({
        id: `browser:${index}`,
        role: entry.selected ? 'selectedBrowserEntry' : 'browserEntry',
        text: entry.text,
        box: createBox(0, entry.y, state.regions.editViewport.w)
      })
    )
  })

  return elements
}

export function locateNanoElements(
  state: NanoState,
  query?: NanoLocateQuery
): Element[] {
  const elements = buildNanoElements(state)

  if (!query) {
    return elements
  }

  return elements.filter((element) => {
    if (query.role && element.role !== query.role) {
      return false
    }

    if (query.text) {
      return matchesText([element.text, element.name], query.text)
    }

    return true
  })
}

function buildRegions(snapshot: ScreenSnapshot): NanoRegions {
  return {
    titleBar: createBox(0, 0, snapshot.cols),
    editViewport: createBox(0, 1, snapshot.cols, Math.max(1, snapshot.rows - 4)),
    statusBar: createBox(0, Math.max(0, snapshot.rows - 3), snapshot.cols),
    helpLines: createBox(0, Math.max(0, snapshot.rows - 2), snapshot.cols, 2)
  }
}

function parseMode(titleBar: string, prompt: NanoPrompt | null): NanoMode {
  const normalizedTitle = titleBar.trim()

  if (normalizedTitle.includes('Main nano help text')) {
    return 'help'
  }

  if (normalizedTitle.startsWith('DIR:')) {
    return 'browser'
  }

  if (normalizedTitle.startsWith('Linting --')) {
    return 'linter'
  }

  if (!prompt) {
    return 'editor'
  }

  switch (prompt.kind) {
    case 'search':
      return 'search'
    case 'replace':
      return 'replace'
    case 'replaceWith':
      return 'replaceWith'
    case 'writeOut':
      return 'writeOut'
    case 'readFile':
      return 'readFile'
    case 'execute':
      return 'execute'
    case 'yesNo':
      return 'yesNo'
    default:
      return 'editor'
  }
}

function parseTitleBar(titleBar: string): {
  version: string
  fileName: string | null
  modified: boolean
  bufferIndex: number | null
  bufferCount: number | null
  flags: Set<string>
} {
  const { body, flags } = splitTitleFlags(titleBar)
  const normalized = body.trim()

  const bufferMatch = /^\[(\d+)\/(\d+)\]\s+(.*)$/u.exec(normalized)

  if (bufferMatch) {
    const fileName = normalizeFileName(bufferMatch[3] ?? '')

    return {
      version: NANO_SUPPORTED_VERSION,
      fileName,
      modified: flags.has('*'),
      bufferIndex: Number(bufferMatch[1]),
      bufferCount: Number(bufferMatch[2]),
      flags
    }
  }

  const titleMatch = /^GNU nano\s+([0-9.]+)\s+(.*)$/u.exec(normalized)

  if (!titleMatch) {
    return {
      version: NANO_SUPPORTED_VERSION,
      fileName: null,
      modified: flags.has('*'),
      bufferIndex: null,
      bufferCount: null,
      flags
    }
  }

  let fileName = (titleMatch[2] ?? '').trim()
  let modified = flags.has('*')

  if (fileName.endsWith('Modified')) {
    modified = true
    fileName = fileName.slice(0, -'Modified'.length).trim()
  }

  return {
    version: titleMatch[1] ?? NANO_SUPPORTED_VERSION,
    fileName: normalizeFileName(fileName),
    modified,
    bufferIndex: null,
    bufferCount: null,
    flags
  }
}

function splitTitleFlags(line: string): {
  body: string
  flags: Set<string>
} {
  let end = line.length - 1

  while (end >= 0 && line[end] === ' ') {
    end -= 1
  }

  if (end < 0 || !isTitleFlag(line[end] ?? '')) {
    return {
      body: line,
      flags: new Set<string>()
    }
  }

  let tokenStart = end

  while (tokenStart >= 0 && isTitleFlag(line[tokenStart] ?? '')) {
    tokenStart -= 1
  }

  let spaces = 0
  let cursor = tokenStart

  while (cursor >= 0 && line[cursor] === ' ') {
    spaces += 1
    cursor -= 1
  }

  if (spaces < 2) {
    return {
      body: line,
      flags: new Set<string>()
    }
  }

  return {
    body: line.slice(0, cursor + 1),
    flags: new Set(line.slice(tokenStart + 1, end + 1).split(''))
  }
}

function isTitleFlag(ch: string): boolean {
  return /[*ILMRS]/u.test(ch)
}

function normalizeFileName(value: string): string | null {
  const normalized = value.trim()

  if (normalized.length === 0 || normalized === 'New Buffer') {
    return null
  }

  return normalized
}

function parsePrompt(
  statusBar: string,
  helpShortcuts: NanoShortcut[]
): NanoPrompt | null {
  const toggles = helpShortcuts.map((shortcut) => shortcut.label)
  const trimmed = statusBar.trim()

  if (
    trimmed.startsWith('Save modified buffer?') ||
    trimmed.startsWith('Replace this instance?')
  ) {
    return {
      kind: 'yesNo',
      text: trimmed,
      input: null,
      toggles
    }
  }

  return (
    parseColonPrompt(statusBar, 'Search:', 'search', toggles) ??
    parseColonPrompt(statusBar, 'Search (to replace):', 'replace', toggles) ??
    parseColonPrompt(statusBar, 'Replace with:', 'replaceWith', toggles) ??
    parseColonPrompt(statusBar, 'Write to File:', 'writeOut', toggles) ??
    parseColonPrompt(
      statusBar,
      'File to read into new buffer',
      'readFile',
      toggles
    ) ??
    parseColonPrompt(statusBar, 'File to insert', 'readFile', toggles) ??
    parseColonPrompt(statusBar, 'Go To Directory:', 'goToDirectory', toggles) ??
    parseColonPrompt(
      statusBar,
      'Command to execute in new buffer:',
      'execute',
      toggles
    ) ??
    parseColonPrompt(statusBar, 'Command to execute:', 'execute', toggles)
  )
}

function parseColonPrompt(
  line: string,
  prefix: string,
  kind: NanoPromptKind,
  toggles: string[]
): NanoPrompt | null {
  const trimmed = line.trimStart()

  if (!trimmed.startsWith(prefix)) {
    return null
  }

  const colonIndex = trimmed.lastIndexOf(':')

  if (colonIndex === -1) {
    return {
      kind,
      text: trimmed,
      input: null,
      toggles
    }
  }

  const text = trimmed.slice(0, colonIndex + 1).trim()
  const input = stripTrailingWhitespace(trimmed.slice(colonIndex + 1)).trimStart()

  return {
    kind,
    text,
    input: input.length > 0 ? input : null,
    toggles
  }
}

function parseStatusMessage(statusBar: string): string | null {
  const trimmed = statusBar.trim()

  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return null
  }

  return trimmed.slice(1, -1).trim() || null
}

function parseHelpShortcuts(snapshot: ScreenSnapshot): NanoShortcut[] {
  const rows = [snapshot.rows - 2, snapshot.rows - 1]
  const shortcuts: NanoShortcut[] = []

  for (const y of rows) {
    const cells = snapshot.lines[y]

    if (!cells) {
      continue
    }

    let x = 0

    while (x < cells.length) {
      while (x < cells.length && !isKeyCell(cells[x])) {
        x += 1
      }

      if (x >= cells.length) {
        break
      }

      const keyStart = x

      while (x < cells.length && cells[x]?.inverse) {
        x += 1
      }

      const labelStart = x

      while (x < cells.length && !isKeyCell(cells[x])) {
        x += 1
      }

      const key = readCells(cells, keyStart, labelStart).trim()
      const label = readCells(cells, labelStart, x).trim()

      if (!key || !label) {
        continue
      }

      shortcuts.push({
        key,
        label,
        box: createBox(keyStart, y, Math.max(1, x - keyStart))
      })
    }
  }

  return shortcuts
}

function parseBrowser(
  snapshot: ScreenSnapshot,
  titleBar: string
): NanoBrowserState {
  const entries: NanoBrowserEntry[] = []
  let selectedIndex: number | null = null
  let selectedText: string | null = null

  for (let y = 1; y < Math.max(1, snapshot.rows - 3); y += 1) {
    const text = stripTrailingWhitespace(getLine(snapshot, y))

    if (text.trim().length === 0) {
      continue
    }

    const highlighted = getHighlightedText(snapshot.lines[y] ?? [])
    const selected = highlighted.length > 0

    if (selected && selectedIndex === null) {
      selectedIndex = entries.length
      selectedText = highlighted.join(' ').trim() || text.trim()
    }

    entries.push({
      text: text.trim(),
      selected,
      y
    })
  }

  return {
    cwd: titleBar.trim().replace(/^DIR:\s*/u, '') || null,
    entries,
    selectedIndex,
    selectedText
  }
}

function parseAnchorLines(snapshot: ScreenSnapshot): number[] {
  const lines: number[] = []

  for (const line of snapshot.plainTextLines) {
    const match = /^\s*(\d+)\+/.exec(line)

    if (match?.[1]) {
      lines.push(Number(match[1]))
    }
  }

  return lines
}

function getHighlightedText(cells: readonly Cell[]): string[] {
  const values: string[] = []
  let index = 0

  while (index < cells.length) {
    while (index < cells.length && !cells[index]?.inverse) {
      index += 1
    }

    if (index >= cells.length) {
      break
    }

    const start = index

    while (index < cells.length && cells[index]?.inverse) {
      index += 1
    }

    const value = readCells(cells, start, index).trim()

    if (value) {
      values.push(value)
    }
  }

  return values
}

function readCells(cells: readonly Cell[], start: number, end: number): string {
  let value = ''

  for (let index = start; index < end; index += 1) {
    value += cells[index]?.ch || ' '
  }

  return value
}

function isKeyCell(cell: Cell | undefined): boolean {
  return Boolean(cell?.inverse && (cell?.ch ?? '').trim().length > 0)
}

function getLine(snapshot: ScreenSnapshot, y: number): string {
  return snapshot.plainTextLines[y] ?? ''
}

function stripTrailingWhitespace(value: string): string {
  return value.replace(/\s+$/u, '')
}

function matchesText(values: Array<string | undefined>, query: TextQuery): boolean {
  if (typeof query === 'string') {
    return values.some((value) => value?.includes(query))
  }

  const regex = new RegExp(query.source, query.flags.replaceAll('g', ''))

  return values.some((value) => Boolean(value && regex.test(value)))
}
