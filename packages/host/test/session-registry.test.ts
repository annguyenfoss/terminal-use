import { describe, expect, it } from 'vitest'

import { SessionRegistry } from '../src/session-registry.js'

describe('SessionRegistry', () => {
  it('creates, attaches, and detaches sessions', () => {
    const registry = new SessionRegistry()
    const record = registry.create({
      id: 'session-1',
      command: 'bash',
      args: ['-i'],
      pty: {} as never,
      terminalState: {} as never,
      tempEnv: { homeDir: '/tmp/test', env: {}, cleanup: async () => {} },
      subscribers: new Set<string>(),
      startedAt: Date.now(),
      exit: null
    })

    expect(registry.get('session-1')).toBe(record)

    registry.attach('session-1', 'connection-1')
    expect(record.subscribers.has('connection-1')).toBe(true)

    registry.detachConnection('connection-1')
    expect(record.subscribers.has('connection-1')).toBe(false)
  })

  it('marks exit state and preserves the record', () => {
    const registry = new SessionRegistry()

    registry.create({
      id: 'session-2',
      command: 'bash',
      args: ['-i'],
      pty: {} as never,
      terminalState: {} as never,
      tempEnv: { homeDir: '/tmp/test', env: {}, cleanup: async () => {} },
      subscribers: new Set<string>(),
      startedAt: Date.now(),
      exit: null
    })

    const record = registry.markExited('session-2', {
      exitCode: 0,
      signal: null
    })

    expect(record.exit).toEqual({ exitCode: 0, signal: null })
    expect(registry.get('session-2')).toBe(record)
  })
})
