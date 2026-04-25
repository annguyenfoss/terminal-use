import type { Cell, Cursor, ScreenPatch, ScreenSnapshot } from '@project-gateway/protocol'

export interface ScreenPatchDiff {
  changed: boolean
  patch: ScreenPatch
}

export function buildScreenPatch(
  previous: ScreenSnapshot,
  next: ScreenSnapshot
): ScreenPatchDiff {
  const rows: ScreenPatch['rows'] = []

  const maxRows = Math.max(previous.rows, next.rows)

  for (let y = 0; y < maxRows; y += 1) {
    const previousRow = previous.lines[y] ?? []
    const nextRow = next.lines[y] ?? []
    const previousText = previous.plainTextLines[y] ?? ''
    const nextText = next.plainTextLines[y] ?? ''

    if (
      previousText !== nextText ||
      !cellsEqual(previousRow, nextRow) ||
      previous.rows !== next.rows ||
      previous.cols !== next.cols
    ) {
      rows.push({
        y,
        text: nextText,
        cells: cloneCells(nextRow, next.cols)
      })
    }
  }

  const patch: ScreenPatch = {
    fromRevision: previous.revision,
    toRevision: next.revision,
    rows
  }

  if (!cursorEqual(previous.cursor, next.cursor)) {
    patch.cursor = next.cursor
  }

  if (previous.title !== next.title) {
    patch.title = next.title
  }

  if (previous.activeBuffer !== next.activeBuffer) {
    patch.activeBuffer = next.activeBuffer
  }

  return {
    changed:
      rows.length > 0 ||
      patch.cursor !== undefined ||
      patch.title !== undefined ||
      patch.activeBuffer !== undefined,
    patch
  }
}

function cellsEqual(left: Cell[], right: Cell[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]
    const b = right[index]

    if (
      a?.ch !== b?.ch ||
      a?.width !== b?.width ||
      a?.fg !== b?.fg ||
      a?.bg !== b?.bg ||
      a?.bold !== b?.bold ||
      a?.dim !== b?.dim ||
      a?.italic !== b?.italic ||
      a?.underline !== b?.underline ||
      a?.inverse !== b?.inverse ||
      a?.blink !== b?.blink ||
      a?.invisible !== b?.invisible ||
      a?.strike !== b?.strike
    ) {
      return false
    }
  }

  return true
}

function cursorEqual(left: Cursor, right: Cursor): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.visible === right.visible &&
    left.shape === right.shape
  )
}

function cloneCells(cells: Cell[], cols: number): Cell[] {
  const result = cells.slice(0, cols).map((cell) => ({ ...cell }))

  while (result.length < cols) {
    result.push({
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
    })
  }

  return result
}
