import { access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildManagedEnv, createManagedTempEnv } from '../src/temp-env.js'

describe('temp-env', () => {
  it('builds a deterministic env and respects overrides', () => {
    const env = buildManagedEnv('/tmp/example', {
      envOverrides: {
        LANG: 'C.UTF-8',
        CUSTOM_FLAG: '1'
      },
      prompt: 'PROMPT> '
    })

    expect(env.HOME).toBe('/tmp/example')
    expect(env.TERM).toBe('xterm-256color')
    expect(env.LANG).toBe('C.UTF-8')
    expect(env.LC_ALL).toBe('C')
    expect(env.CUSTOM_FLAG).toBe('1')
    expect(env.PS1).toBe('PROMPT> ')
  })

  it('creates and cleans up an isolated HOME', async () => {
    const managed = await createManagedTempEnv({
      tempRoot: join(tmpdir(), 'terminal-use-tests')
    })

    await access(managed.homeDir)
    await managed.cleanup()

    await expect(access(managed.homeDir)).rejects.toThrow()
  })
})
