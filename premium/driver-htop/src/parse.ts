import {
  createBox,
  createElement,
  type TextQuery
} from '@terminal-use/driver-kit'
import type { Cell, Element, ScreenSnapshot } from '@terminal-use/protocol'

import {
  HTOP_SUPPORTED_VERSION,
  type HtopCapabilities,
  type HtopLocateQuery,
  type HtopMeter,
  type HtopProcessHeader,
  type HtopProcessHeaderColumn,
  type HtopProcessRow,
  type HtopPrompt,
  type HtopSignalOption,
  type HtopSortPreset,
  type HtopState,
  type HtopTab
} from './types.js'

const SORT_PRESETS = ['pid', 'cpu', 'memory', 'time'] as const

const COLUMN_LAYOUT = [
  { key: 'pid', label: 'PID', treeLabel: 'PID+', x: 2 },
  { key: 'user', label: 'USER', x: 6 },
  { key: 'priority', label: 'PRI', x: 17 },
  { key: 'nice', label: 'NI', x: 22 },
  { key: 'virt', label: 'VIRT', x: 26 },
  { key: 'resident', label: 'RES', x: 33 },
  { key: 'share', label: 'SHR', x: 39 },
  { key: 'state', label: 'S', x: 43 },
  { key: 'cpu', label: 'CPU%', x: 46 },
  { key: 'memory', label: 'MEM%', x: 51 },
  { key: 'time', label: 'TIME+', x: 58 },
  { key: 'command', label: 'Command', x: 65 }
] as const

const SORT_KEY_BY_COLUMN: Partial<Record<(typeof COLUMN_LAYOUT)[number]['key'], HtopSortPreset>> =
  {
    pid: 'pid',
    cpu: 'cpu',
    memory: 'memory',
    time: 'time'
  }

const BASE_CAPABILITIES: HtopCapabilities = {
  version: `${HTOP_SUPPORTED_VERSION}.0`,
  search: true,
  filter: true,
  treeView: true,
  signalMenu: true,
  sortPresets: SORT_PRESETS,
  strace: false,
  lsof: false,
  gdb: false
}

export function matchesHtopSnapshot(snapshot: ScreenSnapshot): boolean {
  return (
    snapshot.plainTextLines.some(
      (line) => line.includes('[Main]') && line.includes('[I/O]')
    ) &&
    snapshot.plainTextLines.some(
      (line) =>
        line.includes('F10Quit') ||
        line.includes('Search:') ||
        line.includes('Filter:') ||
        line.includes('Send signal:')
    )
  )
}

export function getHtopCapabilities(
  overrides: Partial<HtopCapabilities> = {}
): HtopCapabilities {
  return {
    ...BASE_CAPABILITIES,
    ...overrides,
    sortPresets: overrides.sortPresets ?? BASE_CAPABILITIES.sortPresets
  }
}

export function parseHtopState(
  snapshot: ScreenSnapshot,
  capabilities: HtopCapabilities = getHtopCapabilities()
): HtopState {
  const tabsRow = findTabsRow(snapshot)
  const headerRow = tabsRow === null ? null : findHeaderRow(snapshot, tabsRow)
  const footerRow = snapshot.rows - 1
  const tabs = tabsRow === null ? [] : parseTabs(snapshot, tabsRow, headerRow)
  const activeTab = tabs.find((tab) => tab.active)?.name ?? null
  const meters = tabsRow === null ? [] : parseMeters(snapshot, tabsRow)
  const prompt = parsePrompt(snapshot, footerRow)
  const header = headerRow === null ? null : parseHeader(snapshot, headerRow)
  const mode = parseMode(snapshot, headerRow, prompt)
  const treeView = Boolean(header && header.text.includes('PID+'))
  const processes =
    headerRow === null || activeTab !== 'Main' || mode === 'signalMenu'
      ? []
      : parseProcessRows(snapshot, headerRow, footerRow)
  const selectedIndex = processes.findIndex((row) => row.selected)
  const signalOptions =
    mode === 'signalMenu' && headerRow !== null
      ? parseSignalOptions(snapshot, headerRow, footerRow)
      : []
  const selectedSignal =
    signalOptions.find((option) => option.selected)?.signal ?? null

  return {
    version: capabilities.version,
    mode,
    title: snapshot.title,
    tabs,
    activeTab,
    meters,
    header,
    processes,
    selectedIndex: selectedIndex === -1 ? null : selectedIndex,
    selectedProcess: selectedIndex === -1 ? null : processes[selectedIndex] ?? null,
    treeView,
    prompt,
    signalOptions,
    selectedSignal,
    functionBar: parseFunctionBar(snapshot, footerRow),
    capabilities,
    layout: {
      tabsRow,
      headerRow,
      footerRow,
      processStartRow: headerRow === null ? null : headerRow + 1,
      processEndRow: footerRow - 1
    }
  }
}

export function buildHtopElements(state: HtopState): Element[] {
  const elements: Element[] = []

  state.tabs.forEach((tab, index) => {
    elements.push(
      createElement({
        id: `tab:${index}`,
        role: tab.active ? 'activeTab' : 'tab',
        name: tab.name,
        text: tab.name,
        box: tab.box
      })
    )
  })

  state.meters.forEach((meter, index) => {
    elements.push(
      createElement({
        id: `meter:${index}`,
        role: 'meter',
        name: meter.label,
        text: meter.text,
        box: meter.box
      })
    )
  })

  if (state.header) {
    elements.push(
      createElement({
        id: 'header',
        role: 'processHeader',
        text: state.header.text,
        box: state.header.box
      })
    )
  }

  state.processes.forEach((process, index) => {
    elements.push(
      createElement({
        id: `process:${index}`,
        role: process.selected ? 'selectedProcessRow' : 'processRow',
        name: process.pid === null ? undefined : String(process.pid),
        text: `${process.pid ?? ''} ${process.command}`.trim(),
        box: process.box,
        actions: process.selected ? ['killSelected'] : []
      })
    )
  })

  if (state.prompt) {
    elements.push(
      createElement({
        id: 'prompt',
        role: 'prompt',
        name: state.prompt.kind,
        text: `${state.prompt.label} ${state.prompt.input}`.trim(),
        box: state.prompt.box
      })
    )
  }

  state.signalOptions.forEach((option, index) => {
    elements.push(
      createElement({
        id: `signal:${index}`,
        role: option.selected ? 'selectedSignalOption' : 'signalOption',
        name: option.name,
        text: `${option.signal} ${option.name}`,
        box: option.box
      })
    )
  })

  state.functionBar.forEach((action, index) => {
    elements.push(
      createElement({
        id: `footer:${index}`,
        role: 'footerAction',
        text: action
      })
    )
  })

  return elements
}

export function locateHtopElements(
  state: HtopState,
  query?: HtopLocateQuery
): Element[] {
  const elements = buildHtopElements(state)

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

function findTabsRow(snapshot: ScreenSnapshot): number | null {
  for (let y = 0; y < snapshot.rows; y += 1) {
    const line = getLine(snapshot, y)

    if (line.includes('[Main]') && line.includes('[I/O]')) {
      return y
    }
  }

  return null
}

function findHeaderRow(snapshot: ScreenSnapshot, tabsRow: number): number | null {
  for (let y = tabsRow + 1; y < snapshot.rows; y += 1) {
    const line = getLine(snapshot, y)

    if (line.includes('PID') && line.includes('Command')) {
      return y
    }
  }

  return null
}

function parseTabs(
  snapshot: ScreenSnapshot,
  tabsRow: number,
  headerRow: number | null
): HtopTab[] {
  const line = getLine(snapshot, tabsRow)
  const tabs: HtopTab[] = []
  const headerCells = headerRow === null ? [] : snapshot.lines[headerRow] ?? []
  const activeBg = dominantColor(headerCells, 'bg')
  const regex = /\[([^\]]+)\]/gu

  for (const match of line.matchAll(regex)) {
    const name = (match[1] ?? '').trim()
    const start = match.index ?? 0
    const end = start + match[0].length
    const tabBg = dominantColor((snapshot.lines[tabsRow] ?? []).slice(start, end), 'bg')

    tabs.push({
      name,
      active: activeBg !== null ? tabBg === activeBg : tabs.length === 0,
      box: createBox(start, tabsRow, Math.max(1, end - start))
    })
  }

  if (tabs.length > 0 && !tabs.some((tab) => tab.active)) {
    const headerText = headerRow === null ? '' : getLine(snapshot, headerRow)
    const fallbackName = /IO_RATE|IO_READ_RATE|IO_WRITE_RATE/u.test(headerText)
      ? 'I/O'
      : 'Main'

    tabs.forEach((tab, index) => {
      tab.active = tab.name === fallbackName || (index === 0 && fallbackName !== 'I/O')
    })
  }

  return tabs
}

function parseMeters(snapshot: ScreenSnapshot, tabsRow: number): HtopMeter[] {
  const meters: HtopMeter[] = []

  for (let y = 0; y < tabsRow; y += 1) {
    const text = stripTrailingWhitespace(getLine(snapshot, y))

    if (!text.trim()) {
      continue
    }

    meters.push({
      label: parseMeterLabel(text),
      text,
      box: createBox(0, y, snapshot.cols)
    })
  }

  return meters
}

function parseMeterLabel(text: string): string {
  const bracket = text.indexOf('[')

  if (bracket > 0) {
    return text.slice(0, bracket).trim()
  }

  const colon = text.indexOf(':')

  if (colon > 0) {
    return text.slice(0, colon).trim()
  }

  return text.trim().split(/\s+/u)[0] ?? text.trim()
}

function parseHeader(snapshot: ScreenSnapshot, headerRow: number): HtopProcessHeader {
  const text = stripTrailingWhitespace(getLine(snapshot, headerRow))
  const cells = snapshot.lines[headerRow] ?? []
  const headerBg = dominantColor(cells, 'bg')
  const columns: HtopProcessHeaderColumn[] = COLUMN_LAYOUT.map((column, index) => {
    const nextStart = COLUMN_LAYOUT[index + 1]?.x ?? snapshot.cols
    const span = cells.slice(column.x, nextStart)
    const activeSort = hasSortHighlight(span, headerBg)

    return {
      key: column.key,
      label: readCells(cells, column.x, nextStart).trim(),
      x: column.x,
      width: nextStart - column.x,
      activeSort
    }
  })

  const sortColumn = columns.find((column) => column.activeSort)

  return {
    text,
    y: headerRow,
    sort:
      (sortColumn ? SORT_KEY_BY_COLUMN[sortColumn.key] ?? null : null) ?? null,
    columns,
    box: createBox(0, headerRow, snapshot.cols)
  }
}

function hasSortHighlight(
  cells: readonly Cell[],
  headerBg: string | null
): boolean {
  for (const cell of cells) {
    if (!(cell.ch ?? ' ').trim()) {
      continue
    }

    if (cell.bg !== null && cell.bg !== headerBg) {
      return true
    }
  }

  return false
}

function parseProcessRows(
  snapshot: ScreenSnapshot,
  headerRow: number,
  footerRow: number
): HtopProcessRow[] {
  const rows: HtopProcessRow[] = []

  for (let y = headerRow + 1; y < footerRow; y += 1) {
    const line = getLine(snapshot, y)

    if (!/^\s*\d+\s+/u.test(line)) {
      continue
    }

    const cells = snapshot.lines[y] ?? []
    const dominantBg = dominantColor(cells, 'bg')

    rows.push({
      y,
      pid: parseNumber(line.slice(2, 6)),
      user: normalizeNullable(line.slice(6, 17)),
      priority: line.slice(17, 22).trim(),
      nice: line.slice(22, 26).trim(),
      virt: line.slice(26, 33).trim(),
      resident: line.slice(33, 39).trim(),
      share: line.slice(39, 43).trim(),
      state: normalizeNullable(line.slice(43, 45)),
      cpu: line.slice(46, 51).trim(),
      memory: line.slice(51, 58).trim(),
      time: line.slice(58, 65).trim(),
      command: line.slice(65).trimEnd(),
      selected: dominantBg !== null,
      box: createBox(0, y, snapshot.cols)
    })
  }

  return rows
}

function parsePrompt(snapshot: ScreenSnapshot, footerRow: number): HtopPrompt | null {
  for (let y = footerRow; y >= 0; y -= 1) {
    const line = getLine(snapshot, y)
    const searchIndex = line.indexOf('Search:')

    if (searchIndex !== -1) {
      return {
        kind: 'search',
        label: 'Search:',
        input: line.slice(searchIndex + 'Search:'.length).trim(),
        box: createBox(searchIndex, y, Math.max(1, snapshot.cols - searchIndex))
      }
    }

    const filterIndex = line.indexOf('Filter:')

    if (filterIndex !== -1) {
      return {
        kind: 'filter',
        label: 'Filter:',
        input: line.slice(filterIndex + 'Filter:'.length).trim(),
        box: createBox(filterIndex, y, Math.max(1, snapshot.cols - filterIndex))
      }
    }
  }

  return null
}

function parseMode(
  snapshot: ScreenSnapshot,
  headerRow: number | null,
  prompt: HtopPrompt | null
): HtopState['mode'] {
  const headerText = headerRow === null ? '' : getLine(snapshot, headerRow).trim()

  if (headerText.startsWith('Send signal:')) {
    return 'signalMenu'
  }

  if (prompt?.kind === 'search') {
    return 'search'
  }

  if (prompt?.kind === 'filter') {
    return 'filter'
  }

  return 'main'
}

function parseSignalOptions(
  snapshot: ScreenSnapshot,
  headerRow: number,
  footerRow: number
): HtopSignalOption[] {
  const options: HtopSignalOption[] = []

  for (let y = headerRow + 1; y < footerRow; y += 1) {
    const line = getLine(snapshot, y)
    const match = /^\s*(\d+)\s+([A-Za-z0-9]+)/u.exec(line)

    if (!match) {
      continue
    }

    const signal = Number(match[1])
    const name = match[2] ?? ''
    const start = line.indexOf(match[1])
    const end = start + `${signal} ${name}`.length
    const selectionCells = (snapshot.lines[y] ?? []).slice(start, end)

    options.push({
      y,
      signal,
      name,
      selected: hasSignalHighlight(selectionCells),
      box: createBox(start, y, Math.max(1, end - start))
    })
  }

  return options
}

function hasSignalHighlight(cells: readonly Cell[]): boolean {
  return cells.some((cell) => cell.bg === 'ansi:6' || cell.fg === 'ansi:6' || cell.inverse)
}

function parseFunctionBar(
  snapshot: ScreenSnapshot,
  footerRow: number
): string[] {
  for (let y = footerRow; y >= 0; y -= 1) {
    const line = getLine(snapshot, y)

    if (
      !/(F10Quit|Search:|Filter:|EscCancel|EscClear|EnterDone|EnterSend|F1Help)/u.test(
        line
      )
    ) {
      continue
    }

    return (
      line.match(
        /S-F3[A-Za-z]+|F\d{1,2}[A-Za-z]*(?=F\d|\s|$)|Enter[A-Za-z]+|Esc[A-Za-z]+/gu
      ) ?? []
    )
  }

  return []
}

function dominantColor(
  cells: readonly Cell[],
  target: 'fg' | 'bg'
): string | null {
  const counts = new Map<string, number>()

  for (const cell of cells) {
    const value = cell[target]

    if (value === null) {
      continue
    }

    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  let best: { value: string; count: number } | null = null

  for (const [value, count] of counts) {
    if (!best || count > best.count) {
      best = {
        value,
        count
      }
    }
  }

  return best?.value ?? null
}

function readCells(cells: readonly Cell[], start: number, end: number): string {
  let value = ''

  for (let index = start; index < end; index += 1) {
    value += cells[index]?.ch || ' '
  }

  return value
}

function getLine(snapshot: ScreenSnapshot, y: number): string {
  return snapshot.plainTextLines[y] ?? ''
}

function normalizeNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

function parseNumber(value: string): number | null {
  const parsed = Number(value.trim())
  return Number.isInteger(parsed) ? parsed : null
}

function stripTrailingWhitespace(value: string): string {
  return value.replace(/\s+$/u, '')
}

function matchesText(values: Array<string | undefined>, query: TextQuery): boolean {
  return values.some((value) => {
    if (!value) {
      return false
    }

    if (typeof query === 'string') {
      return value.includes(query)
    }

    const regex = new RegExp(query.source, query.flags.replaceAll('g', ''))
    return regex.test(value)
  })
}
