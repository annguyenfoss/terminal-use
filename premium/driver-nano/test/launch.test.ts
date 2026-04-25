import { describe, expect, it } from 'vitest'

import { createNanoLaunchProfile } from '../src/launch.js'

describe('createNanoLaunchProfile', () => {
  it('rejects unsupported commands', async () => {
    const profile = createNanoLaunchProfile({
      command: process.execPath
    })

    await expect(profile({ profile: 'nano', profileArgs: {} })).rejects.toThrow(
      /Unsupported nano version|Unable to determine nano version/
    )
  })
})
