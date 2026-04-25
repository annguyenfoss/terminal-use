import { existsSync, accessSync, constants as fsConstants } from 'node:fs'
import { delimiter, join } from 'node:path'
import { spawnSync } from 'node:child_process'

import type { ActionResult, Driver, DriverIO } from '@project-gateway/driver-kit'

import {
  HTOP_DRIVER_ID,
  HTOP_SUPPORTED_VERSION,
  type HtopCapabilities,
  type HtopDriverOptions,
  type HtopLocateQuery,
  type HtopMode,
  type HtopSortPreset,
  type HtopState
} from './types.js'
import {
  getHtopCapabilities,
  locateHtopElements,
  matchesHtopSnapshot,
  parseHtopState
} from './parse.js'

type HtopDriverInstance = Driver<HtopState, HtopCapabilities>

interface ParsedActionRequest {
  name: string
  args?: unknown
}

export function createHtopDriver(
  options: HtopDriverOptions = {}
): HtopDriverInstance {
  const capabilities = getHtopCapabilities({
    version: probeHtopVersion(options.command),
    strace: hasExecutable('strace'),
    lsof: hasExecutable('lsof'),
    gdb: hasExecutable('gdb')
  })

  return {
    id: HTOP_DRIVER_ID,
    version: '0.6.0-alpha',
    detect(snapshot) {
      return matchesHtopSnapshot(snapshot) ? 1 : 0
    },
    capabilities() {
      return capabilities
    },
    parse(snapshot) {
      return parseHtopState(snapshot, capabilities)
    },
    locate(state, query) {
      return locateHtopElements(state, parseLocateQuery(query))
    },
    async invoke(action, state, io) {
      const request = parseActionRequest(action)

      switch (request.name) {
        case 'moveSelection': {
          const { direction, count } = parseVerticalDirectionArgs(request.args)
          return ok(await moveSelection(io, capabilities, state, direction, count))
        }
        case 'page': {
          const { direction } = parseVerticalDirectionArgs(request.args)
          return ok(await page(io, capabilities, state, direction))
        }
        case 'home':
          return ok(await home(io, capabilities, state))
        case 'end':
          return ok(await end(io, capabilities, state))
        case 'scrollHorizontal': {
          const { direction, count } = parseHorizontalDirectionArgs(request.args)
          return ok(await scrollHorizontal(io, capabilities, state, direction, count))
        }
        case 'toggleTree':
          return ok(await toggleTree(io, capabilities, state))
        case 'search':
          return ok(await search(io, capabilities, state, parseRequiredTextArg(request.args, 'search')))
        case 'filter':
          return ok(await filter(io, capabilities, state, parseRequiredTextArg(request.args, 'filter')))
        case 'clearFilter':
          return ok(await clearFilter(io, capabilities, state))
        case 'sortBy':
          return ok(await sortBy(io, capabilities, state, parseSortPreset(request.args)))
        case 'killSelected':
          return ok(await killSelected(io, capabilities, state, parseOptionalSignal(request.args)))
        case 'refresh':
          return ok(await refresh(io, capabilities, state))
        case 'quit':
          return okNullable(await quit(io))
        default:
          return {
            ok: false,
            error: {
              message: `Unknown htop action: ${request.name}`
            }
          }
      }
    }
  }
}

async function moveSelection(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState,
  direction: 'up' | 'down',
  count: number
): Promise<HtopState> {
  assertMode(current, ['main'], 'moveSelection')
  const baselinePid = current.selectedProcess?.pid ?? null
  const baselineRevision = io.getSnapshot().revision

  for (let index = 0; index < count; index += 1) {
    await pressMeta(io, direction === 'up' ? 'k' : 'j')
  }

  return waitForPossibleChange(
    io,
    capabilities,
    baselineRevision,
    (state) => state.mode === 'main' && state.selectedProcess?.pid !== baselinePid,
    'selection move'
  )
}

async function page(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState,
  direction: 'up' | 'down'
): Promise<HtopState> {
  assertMode(current, ['main'], 'page')
  const baselineRevision = io.getSnapshot().revision
  await io.press(direction === 'up' ? 'PageUp' : 'PageDown')

  return waitForPossibleChange(
    io,
    capabilities,
    baselineRevision,
    (state) => state.mode === 'main',
    `page ${direction}`
  )
}

async function home(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState
): Promise<HtopState> {
  assertMode(current, ['main'], 'home')
  const baselineRevision = io.getSnapshot().revision
  await io.press('Ctrl+A')

  return waitForPossibleChange(
    io,
    capabilities,
    baselineRevision,
    (state) => state.mode === 'main',
    'home'
  )
}

async function end(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState
): Promise<HtopState> {
  assertMode(current, ['main'], 'end')
  const baselineRevision = io.getSnapshot().revision
  await io.press('Ctrl+E')

  return waitForPossibleChange(
    io,
    capabilities,
    baselineRevision,
    (state) => state.mode === 'main',
    'end'
  )
}

async function scrollHorizontal(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState,
  direction: 'left' | 'right',
  count: number
): Promise<HtopState> {
  assertMode(current, ['main'], 'scrollHorizontal')
  const baselineRevision = io.getSnapshot().revision

  for (let index = 0; index < count; index += 1) {
    await pressMeta(io, direction === 'left' ? 'h' : 'l')
  }

  return waitForPossibleChange(
    io,
    capabilities,
    baselineRevision,
    (state) => state.mode === 'main',
    `horizontal scroll ${direction}`
  )
}

async function toggleTree(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState
): Promise<HtopState> {
  assertMode(current, ['main'], 'toggleTree')
  const expected = !current.treeView
  await io.press('t')

  return waitForState(
    io,
    capabilities,
    (state) => state.mode === 'main' && state.treeView === expected,
    'tree toggle'
  )
}

async function search(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState,
  text: string
): Promise<HtopState> {
  assertMode(current, ['main'], 'search')
  await io.press('/')
  await waitForState(
    io,
    capabilities,
    (state) => state.mode === 'search',
    'search prompt'
  )
  await io.type(text)
  await io.press('Enter')

  return waitForState(
    io,
    capabilities,
    (state) => state.mode === 'main',
    'search completion'
  )
}

async function filter(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState,
  text: string
): Promise<HtopState> {
  assertMode(current, ['main'], 'filter')
  await io.type('\\')
  await waitForState(
    io,
    capabilities,
    (state) => state.mode === 'filter',
    'filter prompt'
  )
  await io.type(text)
  await io.press('Enter')

  return waitForState(
    io,
    capabilities,
    (state) =>
      state.mode === 'main' &&
      (state.processes.length === 0 ||
        state.processes.some((row) =>
          row.command.toLowerCase().includes(text.toLowerCase())
        )),
    'filter completion'
  )
}

async function clearFilter(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState
): Promise<HtopState> {
  if (current.mode === 'filter') {
    await io.press('Escape')
  } else {
    assertMode(current, ['main'], 'clearFilter')
    await io.type('\\')
    await waitForState(
      io,
      capabilities,
      (state) => state.mode === 'filter',
      'filter prompt'
    )
    await io.press('Escape')
  }

  return waitForState(
    io,
    capabilities,
    (state) => state.mode === 'main',
    'filter clear'
  )
}

async function sortBy(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState,
  preset: HtopSortPreset
): Promise<HtopState> {
  assertMode(current, ['main'], 'sortBy')

  if (current.header?.sort === preset) {
    return current
  }

  await io.type(sortKeyForPreset(preset))

  return waitForState(
    io,
    capabilities,
    (state) => state.mode === 'main' && state.header?.sort === preset,
    `sort by ${preset}`
  )
}

async function killSelected(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState,
  signal?: number | string
): Promise<HtopState> {
  assertMode(current, ['main'], 'killSelected')

  const targetPid = current.selectedProcess?.pid ?? null
  await io.type('k')
  let menu = await waitForState(
    io,
    capabilities,
    (state) => state.mode === 'signalMenu' && state.signalOptions.length > 0,
    'signal menu'
  )

  if (signal !== undefined) {
    const targetIndex = resolveSignalIndex(menu.signalOptions, signal)

    if (targetIndex === -1) {
      throw new Error(`Unknown signal option: ${String(signal)}`)
    }

    while (true) {
      const selectedIndex = menu.signalOptions.findIndex((option) => option.selected)

      if (selectedIndex === targetIndex) {
        break
      }

      const direction = targetIndex > selectedIndex ? 'j' : 'k'
      const previousSignal = menu.selectedSignal
      await pressMeta(io, direction)

      menu = await waitForState(
        io,
        capabilities,
        (state) =>
          state.mode === 'signalMenu' &&
          state.selectedSignal !== previousSignal,
        'signal selection step'
      )
    }
  }

  await io.press('Enter')
  const next = await waitForState(
    io,
    capabilities,
    (state) => state.mode === 'main',
    'kill completion',
    3_000
  )

  if (targetPid === null) {
    return next
  }

  try {
    return await waitForState(
      io,
      capabilities,
      (state) =>
        state.mode === 'main' &&
        !state.processes.some((process) => process.pid === targetPid),
      'process exit after signal',
      1_500
    )
  } catch {
    return next
  }
}

async function refresh(
  io: DriverIO,
  capabilities: HtopCapabilities,
  current: HtopState
): Promise<HtopState> {
  assertMode(current, ['main'], 'refresh')
  const baselineRevision = io.getSnapshot().revision
  await io.press('Ctrl+L')

  return waitForPossibleChange(
    io,
    capabilities,
    baselineRevision,
    (state) => state.mode === 'main',
    'refresh'
  )
}

async function quit(io: DriverIO): Promise<HtopState | null> {
  await io.type('q')
  return null
}

async function waitForState(
  io: DriverIO,
  capabilities: HtopCapabilities,
  predicate: (state: HtopState) => boolean,
  description: string,
  timeout = 2_000
): Promise<HtopState> {
  const deadline = Date.now() + timeout
  let state = parseHtopState(io.getSnapshot(), capabilities)

  if (predicate(state)) {
    return state
  }

  while (Date.now() <= deadline) {
    try {
      await io.waitForChange({
        timeout: Math.max(25, Math.min(200, deadline - Date.now()))
      })
    } catch {
      await io.refreshSnapshot()
    }

    state = parseHtopState(io.getSnapshot(), capabilities)

    if (predicate(state)) {
      return state
    }
  }

  throw new Error(`Timed out waiting for htop state: ${description}`)
}

async function waitForPossibleChange(
  io: DriverIO,
  capabilities: HtopCapabilities,
  baselineRevision: number,
  predicate: (state: HtopState) => boolean,
  description: string
): Promise<HtopState> {
  try {
    return await waitForState(
      io,
      capabilities,
      (state) =>
        io.getSnapshot().revision > baselineRevision && predicate(state),
      description,
      1_000
    )
  } catch {
    return parseHtopState(io.getSnapshot(), capabilities)
  }
}

function parseActionRequest(value: unknown): ParsedActionRequest {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid htop action request')
  }

  const request = value as ParsedActionRequest

  if (typeof request.name !== 'string' || request.name.trim().length === 0) {
    throw new Error('Invalid htop action name')
  }

  return {
    name: request.name,
    args: request.args
  }
}

function parseLocateQuery(value: unknown): HtopLocateQuery | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid htop locate query')
  }

  return value as HtopLocateQuery
}

function parseVerticalDirectionArgs(
  value: unknown
): { direction: 'up' | 'down'; count: number } {
  return parseDirectionalArgs(value, ['up', 'down'])
}

function parseHorizontalDirectionArgs(
  value: unknown
): { direction: 'left' | 'right'; count: number } {
  return parseDirectionalArgs(value, ['left', 'right'])
}

function parseDirectionalArgs<TDirection extends string>(
  value: unknown,
  allowed: readonly TDirection[]
): { direction: TDirection; count: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Directional htop actions require an args object')
  }

  const { direction, count } = value as Record<string, unknown>

  if (
    typeof direction !== 'string' ||
    !allowed.includes(direction as TDirection)
  ) {
    throw new Error(`direction must be one of ${allowed.join(', ')}`)
  }

  if (
    count !== undefined &&
    (!Number.isInteger(count) || Number(count) <= 0)
  ) {
    throw new Error('count must be a positive integer')
  }

  return {
    direction: direction as TDirection,
    count: Number(count ?? 1)
  }
}

function parseRequiredTextArg(value: unknown, actionName: string): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${actionName} requires an args object`)
  }

  const text = (value as Record<string, unknown>).text

  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error(`${actionName} requires a non-empty text string`)
  }

  return text
}

function parseSortPreset(value: unknown): HtopSortPreset {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('sortBy requires an args object')
  }

  const preset = (value as Record<string, unknown>).preset

  if (
    preset !== 'pid' &&
    preset !== 'cpu' &&
    preset !== 'memory' &&
    preset !== 'time'
  ) {
    throw new Error('sortBy preset must be one of pid, cpu, memory, time')
  }

  return preset
}

function parseOptionalSignal(value: unknown): number | string | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('killSelected args must be an object')
  }

  const signal = (value as Record<string, unknown>).signal

  if (signal === undefined) {
    return undefined
  }

  if (
    typeof signal !== 'number' &&
    typeof signal !== 'string'
  ) {
    throw new Error('killSelected signal must be a number or string')
  }

  return signal
}

function resolveSignalIndex(
  options: readonly { signal: number; name: string }[],
  signal: number | string
): number {
  if (typeof signal === 'number') {
    return options.findIndex((option) => option.signal === signal)
  }

  const normalized = signal.trim().toUpperCase()

  return options.findIndex((option) => {
    if (option.name.toUpperCase() === normalized) {
      return true
    }

    if (option.name.toUpperCase() === `SIG${normalized}`) {
      return true
    }

    return option.name.toUpperCase().replace(/^SIG/u, '') === normalized.replace(/^SIG/u, '')
  })
}

function sortKeyForPreset(preset: HtopSortPreset): string {
  switch (preset) {
    case 'pid':
      return 'N'
    case 'cpu':
      return 'P'
    case 'memory':
      return 'M'
    case 'time':
      return 'T'
  }
}

async function pressMeta(io: DriverIO, key: string): Promise<void> {
  await io.type(`\u001b${key}`)
}

function assertMode(
  state: HtopState,
  modes: readonly HtopMode[],
  action: string
): void {
  if (!modes.includes(state.mode)) {
    throw new Error(`${action} requires htop mode ${modes.join(', ')}, current mode is ${state.mode}`)
  }
}

function ok(value: HtopState): ActionResult {
  return {
    ok: true,
    value
  }
}

function okNullable(value: HtopState | null): ActionResult {
  return {
    ok: true,
    value
  }
}

function probeHtopVersion(command = 'htop'): string {
  try {
    const result = spawnSync(command, ['--version'], {
      encoding: 'utf8'
    })
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    const match = /htop\s+([0-9]+(?:\.[0-9]+)+)/iu.exec(output)

    if (match?.[1]) {
      return match[1]
    }
  } catch {
    return `${HTOP_SUPPORTED_VERSION}.0`
  }

  return `${HTOP_SUPPORTED_VERSION}.0`
}

function hasExecutable(name: string): boolean {
  const pathValue = process.env.PATH

  if (!pathValue) {
    return false
  }

  for (const part of pathValue.split(delimiter)) {
    const candidate = join(part, name)

    try {
      if (existsSync(candidate)) {
        accessSync(candidate, fsConstants.X_OK)
        return true
      }
    } catch {
      continue
    }
  }

  return false
}
