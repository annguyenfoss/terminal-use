import { access, readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { createHtopLaunchProfile } from '../src/launch.js'

describe('createHtopLaunchProfile', () => {
  it('rejects unsupported commands during version probing', async () => {
    const resolver = createHtopLaunchProfile({
      command: process.execPath
    })

    await expect(
      resolver({
        profile: 'htop'
      })
    ).rejects.toThrow(/Unsupported htop version|Unable to determine htop version/u)
  })

  it('creates a managed profile with HTOPRC and mapped args on supported hosts', async () => {
    let supported = false

    try {
      const resolver = createHtopLaunchProfile()
      const launch = await resolver({
        profile: 'htop',
        profileArgs: {
          pids: [123, 456],
          readonly: true
        }
      })
      supported = true

      expect(launch.command).toBe('htop')
      expect(launch.args).toEqual(['--readonly', '-p', '123,456'])
      expect(launch.env?.HTOPRC).toBeTruthy()
      await access(launch.env!.HTOPRC!)
      const template = await readFile(launch.env!.HTOPRC!, 'utf8')
      expect(template).toContain('screen_tabs=1')
      expect(template).toContain('screen:Main=PID USER PRIORITY NICE')
    } catch (error) {
      supported = false

      if (!(error instanceof Error) || !/Unsupported htop version|spawn/u.test(error.message)) {
        throw error
      }
    }

    expect(typeof supported).toBe('boolean')
  })
})
