import { describe, expect, it } from 'vitest'

import { parseNanoState } from '../src/parse.js'
import { createFixtureSnapshot } from './fixtures.js'

describe('parseNanoState', () => {
  it('parses an editor view with shortcuts', () => {
    const snapshot = createFixtureSnapshot({
      lines: [
        'GNU nano 9.0                       New Buffer',
        '',
        'alpha',
        'beta',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '[ Welcome to nano.  For basic help, type Ctrl+G. ]',
        '^G Help      ^O Write Out  ^F Where Is   ^K Cut',
        '^X Exit      ^R Read File  ^\\ Replace    ^U Paste'
      ],
      inverseSpans: [
        { y: 22, start: 0, end: 2 },
        { y: 22, start: 13, end: 15 },
        { y: 22, start: 28, end: 30 },
        { y: 22, start: 43, end: 45 },
        { y: 23, start: 0, end: 2 },
        { y: 23, start: 13, end: 15 },
        { y: 23, start: 28, end: 30 },
        { y: 23, start: 43, end: 45 }
      ]
    })

    const state = parseNanoState(snapshot)

    expect(state.mode).toBe('editor')
    expect(state.version).toBe('9.0')
    expect(state.fileName).toBeNull()
    expect(state.modified).toBe(false)
    expect(
      state.helpShortcuts.some((shortcut) => shortcut.label.includes('Write Out'))
    ).toBe(true)
  })

  it('parses a modified editor title', () => {
    const snapshot = createFixtureSnapshot({
      lines: [
        'GNU nano 9.0    /tmp/sample.txt                             Modified',
        '',
        'body',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '[ Modified ]',
        '^G Help',
        '^X Exit'
      ],
      inverseSpans: [
        { y: 22, start: 0, end: 2 },
        { y: 23, start: 0, end: 2 }
      ]
    })

    const state = parseNanoState(snapshot)

    expect(state.fileName).toBe('/tmp/sample.txt')
    expect(state.modified).toBe(true)
  })

  it('parses search, write-out, and read-file prompts', () => {
    const search = parseNanoState(
      createFixtureSnapshot({
        lines: [
          'GNU nano 9.0    /tmp/sample.txt',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'Search: beta',
          '^C Cancel',
          '^T Go To Line'
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 2 },
          { y: 23, start: 0, end: 2 }
        ]
      })
    )
    const writeOut = parseNanoState(
      createFixtureSnapshot({
        lines: [
          'GNU nano 9.0    /tmp/sample.txt',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'Write to File: /tmp/sample.txt',
          '^C Cancel       ^T Browse',
          ''
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 2 },
          { y: 22, start: 17, end: 19 }
        ]
      })
    )
    const readFile = parseNanoState(
      createFixtureSnapshot({
        lines: [
          'GNU nano 9.0                       New Buffer',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'File to insert [from ./]: /tmp/input.txt',
          '^C Cancel       ^T Browse',
          ''
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 2 },
          { y: 22, start: 17, end: 19 }
        ]
      })
    )

    expect(search.mode).toBe('search')
    expect(search.prompt?.input).toBe('beta')
    expect(writeOut.mode).toBe('writeOut')
    expect(writeOut.prompt?.input).toBe('/tmp/sample.txt')
    expect(readFile.mode).toBe('readFile')
    expect(readFile.prompt?.input).toBe('/tmp/input.txt')
  })

  it('parses replace, replace-with, and execute prompts', () => {
    const replace = parseNanoState(
      createFixtureSnapshot({
        lines: [
          'GNU nano 9.0    /tmp/sample.txt',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'Search (to replace): alpha',
          '^C Cancel       M-B Backwards  M-C Case Sensitive',
          'M-R Regular Expressions'
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 2 },
          { y: 22, start: 17, end: 20 },
          { y: 22, start: 33, end: 36 },
          { y: 23, start: 0, end: 3 }
        ]
      })
    )
    const replaceWith = parseNanoState(
      createFixtureSnapshot({
        lines: [
          'GNU nano 9.0    /tmp/sample.txt',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'Replace with: omega',
          '^C Cancel',
          '^T Go To Line'
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 2 },
          { y: 23, start: 0, end: 2 }
        ]
      })
    )
    const execute = parseNanoState(
      createFixtureSnapshot({
        lines: [
          'GNU nano 9.0    /tmp/sample.txt',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'Command to execute in new buffer: printf hello',
          'M-F New Buffer   ^S Spell Check   ^Y Linter',
          '^C Cancel        ^O Formatter     M-\\ Pipe Text'
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 3 },
          { y: 22, start: 17, end: 19 },
          { y: 22, start: 34, end: 36 },
          { y: 23, start: 0, end: 2 },
          { y: 23, start: 18, end: 20 },
          { y: 23, start: 35, end: 38 }
        ]
      })
    )

    expect(replace.mode).toBe('replace')
    expect(replace.prompt?.input).toBe('alpha')
    expect(replace.prompt?.toggles.length).toBeGreaterThan(0)
    expect(
      replace.prompt?.toggles.some((toggle) =>
        toggle.includes('Regular')
      )
    ).toBe(true)
    expect(replaceWith.mode).toBe('replaceWith')
    expect(replaceWith.prompt?.input).toBe('omega')
    expect(execute.mode).toBe('execute')
    expect(execute.prompt?.input).toBe('printf hello')
    expect(
      execute.helpShortcuts.some((shortcut) => shortcut.label.includes('Spell Check'))
    ).toBe(true)
    expect(
      execute.helpShortcuts.some((shortcut) => shortcut.label.includes('Formatter'))
    ).toBe(true)
    expect(
      execute.helpShortcuts.some((shortcut) => shortcut.label.includes('Linter'))
    ).toBe(true)
    expect(
      execute.helpShortcuts.some((shortcut) => shortcut.label.includes('Pipe Text'))
    ).toBe(true)
  })

  it('parses the help viewer and yes/no prompt', () => {
    const help = parseNanoState(
      createFixtureSnapshot({
        lines: [
          '                             Main nano help text',
          '',
          'The nano editor is designed to be simple.',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '^X Exit     ^V Next Page',
          '^P Prev     ^N Next'
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 2 },
          { y: 22, start: 12, end: 14 },
          { y: 23, start: 0, end: 2 },
          { y: 23, start: 12, end: 14 }
        ]
      })
    )
    const yesNo = parseNanoState(
      createFixtureSnapshot({
        lines: [
          'GNU nano 9.0    /tmp/sample.txt                             Modified',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'Save modified buffer?',
          'Y Yes',
          'N No            ^C Cancel'
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 1 },
          { y: 23, start: 0, end: 1 },
          { y: 23, start: 16, end: 18 }
        ]
      })
    )

    expect(help.mode).toBe('help')
    expect(yesNo.mode).toBe('yesNo')
    expect(yesNo.prompt?.kind).toBe('yesNo')
  })

  it('parses a browser view with a selected entry', () => {
    const browserFile = 'phase4-browser-target-entry-with-a-very-long-name.txt'
    const snapshot = createFixtureSnapshot({
      lines: [
        'DIR: /tmp/project-gateway-nano-fixture',
        browserFile,
        '..                         (parent dir)',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '^/ Go To Dir  ^F Where Is',
        '^X Close      ^N Next Line'
      ],
      inverseSpans: [
        { y: 1, start: 0, end: browserFile.length },
        { y: 22, start: 0, end: 2 },
        { y: 22, start: 14, end: 16 },
        { y: 23, start: 0, end: 2 },
        { y: 23, start: 14, end: 16 }
      ]
    })

    const state = parseNanoState(snapshot)

    expect(state.mode).toBe('browser')
    expect(state.browser?.cwd).toBe('/tmp/project-gateway-nano-fixture')
    expect(state.browser?.selectedText).toContain(browserFile)
    expect(state.browser?.selectedIndex).toBe(0)
  })

  it('parses multibuffer flags, anchor lines, and linter mode', () => {
    const multibuffer = parseNanoState(
      createFixtureSnapshot({
        lines: [
          '[2/3] /tmp/two.txt                                              MR',
          ' 1+alpha',
          ' 2 beta',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '[ Recording a macro... ]',
          '^X Close      M-< Prev Buffer',
          'M-> Next Buffer'
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 2 },
          { y: 22, start: 14, end: 17 },
          { y: 23, start: 0, end: 3 }
        ]
      })
    )
    const linter = parseNanoState(
      createFixtureSnapshot({
        lines: [
          'Linting -- /tmp/sample.txt',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '[ lint says hello ]',
          '^Y Previous Linter message',
          '^V Next Linter message'
        ],
        inverseSpans: [
          { y: 22, start: 0, end: 2 },
          { y: 23, start: 0, end: 2 }
        ]
      })
    )

    expect(multibuffer.mode).toBe('editor')
    expect(multibuffer.bufferIndex).toBe(2)
    expect(multibuffer.bufferCount).toBe(3)
    expect(multibuffer.macroRecording).toBe(true)
    expect(multibuffer.markActive).toBe(true)
    expect(multibuffer.anchorLines).toEqual([1])
    expect(multibuffer.capabilities.multibuffer).toBe(true)
    expect(multibuffer.capabilities.anchors).toBe(true)
    expect(linter.mode).toBe('linter')
    expect(linter.statusMessage).toBe('lint says hello')
    expect(linter.capabilities.linter).toBe(true)
  })
})
