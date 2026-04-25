import type { ScreenSnapshot } from '@terminal-use/protocol'
import type * as xtermHeadless from '@xterm/headless'

type Cell = ScreenSnapshot['lines'][number][number]
type Cursor = ScreenSnapshot['cursor']

export interface SnapshotBuildOptions {
  revision: number
  title: string | null
}

export function buildScreenSnapshot(
  terminal: xtermHeadless.Terminal,
  options: SnapshotBuildOptions
): ScreenSnapshot {
  const buffer = terminal.buffer.active
  const viewportTop = buffer.viewportY
  const viewportBottom = viewportTop + terminal.rows
  const lines: Cell[][] = []
  const plainTextLines: string[] = []
  const nullCell = buffer.getNullCell()

  for (let y = viewportTop; y < viewportBottom; y += 1) {
    const line = buffer.getLine(y)
    const cells: Cell[] = []

    for (let x = 0; x < terminal.cols; x += 1) {
      const cell = line?.getCell(x, nullCell)
      cells.push(cell ? toProtocolCell(cell) : createEmptyCell())
    }

    lines.push(cells)
    plainTextLines.push(line?.translateToString(true, 0, terminal.cols) ?? '')
  }

  const scrollbackLines: string[] = []

  for (let y = 0; y < viewportTop; y += 1) {
    const line = buffer.getLine(y)
    scrollbackLines.push(line?.translateToString(true, 0, terminal.cols) ?? '')
  }

  return {
    revision: options.revision,
    cols: terminal.cols,
    rows: terminal.rows,
    activeBuffer: buffer.type === 'alternate' ? 'alternate' : 'primary',
    title: options.title,
    cursor: buildCursor(terminal, buffer),
    lines,
    plainTextLines,
    scrollbackLines
  }
}

export function createEmptyCell(): Cell {
  return {
    ch: '',
    width: 1,
    fg: null,
    bg: null,
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    inverse: false,
    blink: false,
    invisible: false,
    strike: false
  }
}

function buildCursor(
  terminal: xtermHeadless.Terminal,
  buffer: xtermHeadless.IBuffer
): Cursor {
  const configuredShape = terminal.options.cursorStyle
  const shape =
    configuredShape === 'block' ||
    configuredShape === 'bar' ||
    configuredShape === 'underline'
      ? configuredShape
      : 'unknown'

  return {
    x: buffer.cursorX,
    y: buffer.cursorY,
    visible: true,
    shape
  }
}

function toProtocolCell(cell: xtermHeadless.IBufferCell): Cell {
  const width = cell.getWidth()

  return {
    ch: cell.getChars(),
    width: width === 2 ? 2 : 1,
    fg: encodeColor(cell, 'fg'),
    bg: encodeColor(cell, 'bg'),
    bold: Boolean(cell.isBold()),
    dim: Boolean(cell.isDim()),
    italic: Boolean(cell.isItalic()),
    underline: Boolean(cell.isUnderline()),
    inverse: Boolean(cell.isInverse()),
    blink: Boolean(cell.isBlink()),
    invisible: Boolean(cell.isInvisible()),
    strike: Boolean(cell.isStrikethrough())
  }
}

function encodeColor(
  cell: xtermHeadless.IBufferCell,
  target: 'fg' | 'bg'
): string | null {
  const isDefault = target === 'fg' ? cell.isFgDefault() : cell.isBgDefault()

  if (isDefault) {
    return null
  }

  const isRgb = target === 'fg' ? cell.isFgRGB() : cell.isBgRGB()
  const value = target === 'fg' ? cell.getFgColor() : cell.getBgColor()

  if (isRgb) {
    return `#${value.toString(16).padStart(6, '0')}`
  }

  return `ansi:${value}`
}
