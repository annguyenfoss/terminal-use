import type { Cell, ScreenSnapshot } from '@terminal-use/protocol'

import type { SessionLaunchOptions } from '../src/index.js'

export function createManagedShellOptions(): SessionLaunchOptions {
  return {
    command: 'bash',
    args: ['--noprofile', '--norc', '-i'],
    env: {
      PS1: 'PROMPT> '
    },
    cols: 80,
    rows: 24
  }
}

export function createSnapshot(lines: string[]): ScreenSnapshot {
  const cols = Math.max(20, ...lines.map((line) => line.length))

  return {
    revision: 1,
    cols,
    rows: lines.length,
    activeBuffer: 'primary',
    title: null,
    cursor: {
      x: 0,
      y: 0,
      visible: true,
      shape: 'block'
    },
    lines: lines.map((line) => toCells(line, cols)),
    plainTextLines: [...lines],
    scrollbackLines: []
  }
}

function toCells(line: string, cols: number): Cell[] {
  const cells = [...line].map<Cell>((ch) => ({
    ch,
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
  }))

  while (cells.length < cols) {
    cells.push({
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

  return cells
}
