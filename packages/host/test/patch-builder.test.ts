import { describe, expect, it } from 'vitest'
import type { ScreenSnapshot } from '@terminal-use/protocol'

import { buildScreenPatch } from '../src/patch-builder.js'

describe('buildScreenPatch', () => {
  it('emits changed rows and cursor metadata', () => {
    const previous = createSnapshot({
      revision: 1,
      rows: ['one', 'two'],
      cursor: { x: 0, y: 0, visible: true, shape: 'block' }
    })
    const next = createSnapshot({
      revision: 2,
      rows: ['one', 'TWO'],
      cursor: { x: 2, y: 1, visible: true, shape: 'block' }
    })

    const diff = buildScreenPatch(previous, next)

    expect(diff.changed).toBe(true)
    expect(diff.patch.rows).toEqual([
      {
        y: 1,
        text: 'TWO',
        cells: next.lines[1]
      }
    ])
    expect(diff.patch.cursor).toEqual(next.cursor)
  })

  it('detects title and buffer changes without row mutations', () => {
    const previous = createSnapshot({
      revision: 2,
      rows: ['same'],
      title: null,
      activeBuffer: 'primary'
    })
    const next = createSnapshot({
      revision: 3,
      rows: ['same'],
      title: 'title',
      activeBuffer: 'alternate'
    })

    const diff = buildScreenPatch(previous, next)

    expect(diff.changed).toBe(true)
    expect(diff.patch.rows).toEqual([])
    expect(diff.patch.title).toBe('title')
    expect(diff.patch.activeBuffer).toBe('alternate')
  })
})

function createSnapshot(options: {
  revision: number
  rows: string[]
  cursor?: ScreenSnapshot['cursor']
  title?: string | null
  activeBuffer?: ScreenSnapshot['activeBuffer']
}): ScreenSnapshot {
  const cols = Math.max(...options.rows.map((row) => row.length), 1)

  return {
    revision: options.revision,
    cols,
    rows: options.rows.length,
    activeBuffer: options.activeBuffer ?? 'primary',
    title: options.title ?? null,
    cursor:
      options.cursor ?? {
        x: 0,
        y: 0,
        visible: true,
        shape: 'block'
      },
    lines: options.rows.map((row) =>
      row.split('').map((ch) => ({
        ch,
        width: 1 as const,
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
      }))
    ),
    plainTextLines: options.rows,
    scrollbackLines: []
  }
}
