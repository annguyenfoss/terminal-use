import { describe, expect, it } from 'vitest'

import { parseHtopState } from '../src/parse.js'
import { createFixtureSnapshot } from './fixtures.js'

describe('parseHtopState', () => {
  it('parses the managed main view, active tab, selected row, and sort preset', () => {
    const snapshot = createFixtureSnapshot({
      lines: [
        '',
        '    0[|||||100.0%]   3[       0.0%]   6[       0.0%]   9[       0.0%]',
        '    1[       0.0%]   4[       0.0%]   7[       0.0%]',
        '    2[       0.0%]   5[       0.0%]   8[       0.0%]',
        '  Mem[|||||||||||| 17.6G/62.4G] Tasks: 3, 11 thr, 0 kthr; 3 running',
        '  Swp[                0K/16.0G] Load average: 3.08 3.61 3.25',
        '                                              Uptime: 20:17:24',
        '',
        '  [Main] [I/O]',
        '  PID USER       PRI  NI  VIRT   RES   SHR S  CPU%-MEM%   TIME+  Command',
        '    1 stk         20   0  3012  1308  1120 S   0.0  0.0  0:00.00 bwrap --new-session',
        '   14 stk         20   0  5612  4276  3176 R   0.0  0.0  0:00.00 htop --readonly',
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
        'F1Help  F2Setup F3SearchF4FilterF5Tree  F6SortByF7      F8      F9      F10Quit'
      ],
      spans: [
        { y: 8, start: 2, end: 8, bg: 'ansi:2', fg: 'ansi:0' },
        { y: 8, start: 9, end: 14, bg: 'ansi:4', fg: 'ansi:0' },
        { y: 9, start: 0, end: 140, bg: 'ansi:2', fg: 'ansi:0' },
        { y: 9, start: 45, end: 51, bg: 'ansi:6', fg: 'ansi:0' },
        { y: 10, start: 0, end: 100, bg: 'ansi:6', fg: 'ansi:0' }
      ]
    })

    const state = parseHtopState(snapshot)

    expect(state.mode).toBe('main')
    expect(state.activeTab).toBe('Main')
    expect(state.header?.sort).toBe('cpu')
    expect(state.processes[0]?.pid).toBe(1)
    expect(state.selectedProcess?.pid).toBe(1)
    expect(state.functionBar).toContain('F10Quit')
  })

  it('parses tree view rows from the managed header layout', () => {
    const snapshot = createFixtureSnapshot({
      lines: [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '  [Main] [I/O]',
        '  PID+USER       PRI  NI  VIRT   RES   SHR S  CPU% MEM%   TIME+  Command',
        '    1 stk         20   0  3012  1308  1120 S   0.0  0.0  0:00.00 init',
        '    2 stk         20   0 1496M 94304 69832 R   0.0  0.1  0:00.07 `- node app.js',
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
        'F1Help  F2Setup F3SearchF4FilterF5Tree  F6SortByF7      F8      F9      F10Quit'
      ],
      spans: [
        { y: 8, start: 2, end: 8, bg: 'ansi:2', fg: 'ansi:0' },
        { y: 8, start: 9, end: 14, bg: 'ansi:4', fg: 'ansi:0' },
        { y: 9, start: 0, end: 140, bg: 'ansi:2', fg: 'ansi:0' }
      ]
    })

    const state = parseHtopState(snapshot)

    expect(state.treeView).toBe(true)
    expect(state.header?.text.includes('PID+')).toBe(true)
    expect(state.processes[1]?.command.startsWith('`- node')).toBe(true)
  })

  it('parses search and filter prompts from the footer', () => {
    const search = parseHtopState(
      createFixtureSnapshot({
        lines: [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '  [Main] [I/O]',
          '  PID USER       PRI  NI  VIRT   RES   SHR S  CPU%-MEM%   TIME+  Command',
          '    1 stk         20   0  3012  1308  1120 S   0.0  0.0  0:00.00 init',
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
          'F3Next  S-F3Prev   EscCancel    Search: node'
        ],
        spans: [
          { y: 8, start: 2, end: 8, bg: 'ansi:2', fg: 'ansi:0' },
          { y: 9, start: 0, end: 140, bg: 'ansi:2', fg: 'ansi:0' }
        ]
      })
    )

    const filter = parseHtopState(
      createFixtureSnapshot({
        lines: [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '  [Main] [I/O]',
          '  PID USER       PRI  NI  VIRT   RES   SHR S  CPU%-MEM%   TIME+  Command',
          '    1 stk         20   0  3012  1308  1120 S   0.0  0.0  0:00.00 init',
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
          'EnterDone  EscClear    Filter: node'
        ],
        spans: [
          { y: 8, start: 2, end: 8, bg: 'ansi:2', fg: 'ansi:0' },
          { y: 9, start: 0, end: 140, bg: 'ansi:2', fg: 'ansi:0' }
        ]
      })
    )

    expect(search.mode).toBe('search')
    expect(search.prompt?.input).toBe('node')
    expect(filter.mode).toBe('filter')
    expect(filter.prompt?.input).toBe('node')
  })

  it('parses the signal menu and selected signal option', () => {
    const snapshot = createFixtureSnapshot({
      lines: [
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '  [Main] [I/O]',
        'Send signal:     PID USER       PRI  NI  VIRT   RES   SHR S  CPU%-MEM%   TIME+  Command',
        ' 0 Cancel         10 stk         20   0  6164  4044  3932 S   0.0  0.0  0:00.00 sleep 30',
        ' 1 SIGHUP',
        ' 2 SIGINT',
        ' 3 SIGQUIT',
        ' 4 SIGILL',
        ' 5 SIGTRAP',
        ' 6 SIGABRT',
        ' 6 SIGIOT',
        ' 7 SIGBUS',
        ' 8 SIGFPE',
        ' 9 SIGKILL',
        '10 SIGUSR1',
        '11 SIGSEGV',
        '12 SIGUSR2',
        '13 SIGPIPE',
        '14 SIGALRM',
        '15 SIGTERM',
        '16 SIGSTKFLT',
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
        'EnterSend   EscCancel'
      ],
      spans: [
        { y: 8, start: 2, end: 8, bg: 'ansi:2', fg: 'ansi:0' },
        { y: 9, start: 0, end: 140, bg: 'ansi:2', fg: 'ansi:0' },
        { y: 9, start: 45, end: 51, bg: 'ansi:6', fg: 'ansi:0' },
        { y: 10, start: 0, end: 120, bg: 'ansi:7', fg: 'ansi:0' },
        { y: 26, start: 0, end: 14, fg: 'ansi:6' }
      ]
    })

    const state = parseHtopState(snapshot)

    expect(state.mode).toBe('signalMenu')
    expect(state.signalOptions.length).toBeGreaterThan(10)
    expect(state.selectedSignal).toBe(15)
    expect(state.signalOptions.some((option) => option.name === 'SIGKILL')).toBe(true)
  })
})
