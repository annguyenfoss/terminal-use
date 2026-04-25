import type {
  Element,
  ElementBox,
  ScreenSnapshot
} from '@terminal-use/protocol'

export interface ActionResult {
  ok: boolean
  value?: unknown
  error?: unknown
}

export interface DriverWaitOptions {
  timeout?: number
}

export interface DriverIO {
  getSnapshot(): ScreenSnapshot
  refreshSnapshot(): Promise<ScreenSnapshot>
  type(text: string): Promise<void>
  paste(text: string): Promise<void>
  press(key: string): Promise<void>
  waitForChange(options?: DriverWaitOptions): Promise<ScreenSnapshot>
}

export interface Driver<TState = unknown, TCapabilities = unknown> {
  id: string
  version: string
  detect(snapshot: ScreenSnapshot): number
  capabilities(snapshot: ScreenSnapshot): TCapabilities
  parse(snapshot: ScreenSnapshot): TState
  locate(state: TState, query: unknown): Element[]
  invoke(action: unknown, state: TState, io: DriverIO): Promise<ActionResult>
}

export interface VisibleRow {
  y: number
  text: string
}

export interface TextRowMatch {
  y: number
  text: string
  start: number
  end: number
}

export type TextQuery = string | RegExp

export const DRIVER_KIT_PACKAGE_NAME = '@terminal-use/driver-kit'

export function getVisibleRows(snapshot: ScreenSnapshot): VisibleRow[] {
  return snapshot.plainTextLines.map((text, y) => ({ y, text }))
}

export function getVisibleText(snapshot: ScreenSnapshot): string {
  return snapshot.plainTextLines.join('\n')
}

export function readRegionLines(
  snapshot: ScreenSnapshot,
  startY: number,
  endY: number
): string[] {
  return snapshot.plainTextLines.slice(startY, endY + 1)
}

export function findTextRowMatches(
  rows: readonly string[],
  query: TextQuery
): TextRowMatch[] {
  const matches: TextRowMatch[] = []

  rows.forEach((text, y) => {
    const match = findTextMatch(text, query)

    if (!match) {
      return
    }

    matches.push({
      y,
      text,
      start: match.start,
      end: match.end
    })
  })

  return matches
}

export function createBox(
  x: number,
  y: number,
  width: number,
  height = 1
): ElementBox {
  return {
    x,
    y,
    w: Math.max(1, width),
    h: Math.max(1, height)
  }
}

export function createElement(options: {
  id: string
  role: string
  name?: string
  text?: string
  origin?: 'driver' | 'heuristic'
  confidence?: number
  box?: ElementBox
  actions?: string[]
}): Element {
  return {
    id: options.id,
    role: options.role,
    name: options.name,
    text: options.text,
    origin: options.origin ?? 'driver',
    confidence: options.confidence ?? 1,
    box: options.box,
    actions: options.actions ?? []
  }
}

export function createTextElements(options: {
  rows: readonly string[]
  query: TextQuery
  role: string
  idPrefix: string
  actions?: string[]
}): Element[] {
  return findTextRowMatches(options.rows, options.query).map((match, index) =>
    createElement({
      id: `${options.idPrefix}:${index}`,
      role: options.role,
      text: match.text,
      box: createBox(match.start, match.y, match.end - match.start),
      actions: options.actions ?? []
    })
  )
}

function findTextMatch(
  text: string,
  query: TextQuery
): { start: number; end: number } | null {
  if (typeof query === 'string') {
    const start = text.indexOf(query)

    if (start === -1) {
      return null
    }

    return {
      start,
      end: start + Math.max(1, query.length)
    }
  }

  const regex = new RegExp(query.source, query.flags.replaceAll('g', ''))
  const match = regex.exec(text)

  if (!match || match.index === undefined) {
    return null
  }

  return {
    start: match.index,
    end: match.index + Math.max(1, match[0]?.length ?? 0)
  }
}
