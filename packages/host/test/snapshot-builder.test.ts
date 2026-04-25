import { describe, expect, it } from 'vitest'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import * as xtermHeadless from '@xterm/headless'

import { buildScreenSnapshot } from '../src/snapshot-builder.js'

describe('buildScreenSnapshot', () => {
  it('captures visible rows, colors, and wide characters', async () => {
    const terminal = new xtermHeadless.Terminal({
      allowProposedApi: true,
      cols: 6,
      rows: 2,
      scrollback: 10
    })
    terminal.loadAddon(new Unicode11Addon())
    terminal.unicode.activeVersion = '11'

    await write(terminal, '\u001b[31mA\u001b[0m\r\n\u001b[38;2;17;34;51m界\u001b[0m')

    const snapshot = buildScreenSnapshot(terminal, {
      revision: 1,
      title: 'demo'
    })

    expect(snapshot.revision).toBe(1)
    expect(snapshot.title).toBe('demo')
    expect(snapshot.plainTextLines[0]).toBe('A')
    expect(snapshot.lines[0][0].fg).toBe('ansi:1')
    expect(snapshot.lines[1][0].ch).toBe('界')
    expect(snapshot.lines[1][0].width).toBe(2)
    expect(snapshot.lines[1][0].fg).toBe('#112233')
    expect(snapshot.lines[1][1].ch).toBe('')
  })

  it('captures scrollback and alternate buffer state', async () => {
    const terminal = new xtermHeadless.Terminal({
      allowProposedApi: true,
      cols: 8,
      rows: 2,
      scrollback: 10
    })

    await write(terminal, 'one\r\ntwo\r\nthree')
    let snapshot = buildScreenSnapshot(terminal, { revision: 2, title: null })

    expect(snapshot.scrollbackLines).toContain('one')
    expect(snapshot.plainTextLines).toContain('three')

    await write(terminal, '\u001b[?1049hALT')
    snapshot = buildScreenSnapshot(terminal, { revision: 3, title: null })

    expect(snapshot.activeBuffer).toBe('alternate')
    expect(snapshot.plainTextLines.some((line) => line.includes('ALT'))).toBe(true)
  })
})

function write(
  terminal: xtermHeadless.Terminal,
  data: string
): Promise<void> {
  return new Promise((resolve) => {
    terminal.write(data, resolve)
  })
}
