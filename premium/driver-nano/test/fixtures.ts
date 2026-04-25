import type { Cell, ScreenSnapshot } from '@terminal-use/protocol'

interface InverseSpan {
  y: number
  start: number
  end: number
}

export function createFixtureSnapshot(options: {
  lines: string[]
  inverseSpans?: InverseSpan[]
  rows?: number
  cols?: number
  cursor?: Partial<ScreenSnapshot['cursor']>
}): ScreenSnapshot {
  const rows = options.rows ?? 24
  const cols = options.cols ?? 80
  const paddedLines = [...options.lines]

  while (paddedLines.length < rows) {
    paddedLines.push('')
  }

  const spansByRow = new Map<number, InverseSpan[]>()

  for (const span of options.inverseSpans ?? []) {
    const existing = spansByRow.get(span.y) ?? []
    existing.push(span)
    spansByRow.set(span.y, existing)
  }

  return {
    revision: 1,
    cols,
    rows,
    activeBuffer: 'primary',
    title: null,
    cursor: {
      x: options.cursor?.x ?? 0,
      y: options.cursor?.y ?? 0,
      visible: options.cursor?.visible ?? true,
      shape: options.cursor?.shape ?? 'block'
    },
    lines: paddedLines.slice(0, rows).map((line, y) =>
      createCells(line, cols, spansByRow.get(y) ?? [])
    ),
    plainTextLines: paddedLines.slice(0, rows),
    scrollbackLines: []
  }
}

function createCells(
  line: string,
  cols: number,
  spans: InverseSpan[]
): Cell[] {
  const values: Cell[] = []

  for (let x = 0; x < cols; x += 1) {
    const ch = line[x] ?? ' '
    const inverse = spans.some((span) => x >= span.start && x < span.end)

    values.push({
      ch,
      width: 1,
      fg: null,
      bg: null,
      bold: false,
      dim: false,
      italic: false,
      underline: false,
      inverse,
      blink: false,
      invisible: false,
      strike: false
    })
  }

  return values
}
