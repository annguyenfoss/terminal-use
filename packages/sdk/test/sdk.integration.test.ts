import { describe, expect, it } from 'vitest'

import { createHostServer } from '../../host/src/index.js'
import {
  TimeoutError,
  createInProcessClient
} from '../src/index.js'
import { createManagedShellOptions } from './helpers.js'

describe('SDK in-process transport', () => {
  it('starts a shell, drives it, and exposes cached screen state', async () => {
    const host = createHostServer()
    const client = await createInProcessClient(host)
    const rawMessages: string[] = []
    const unlistenRaw = client.raw.onMessage((message) => {
      rawMessages.push(message.type)
    })

    try {
      const session = await client.startSession(createManagedShellOptions())

      expect(session.mouse.isSupported()).toBe(false)

      await session.waitForText('PROMPT>')
      await session.keyboard.type('echo sdk-in-process')
      await session.keyboard.press('Enter')
      await session.waitForText('sdk-in-process')

      expect(session.screen.visibleText()).toContain('sdk-in-process')

      const refreshed = await session.screen.refresh()
      expect(
        refreshed.plainTextLines.some((line) => line.includes('sdk-in-process'))
      ).toBe(true)

      await expect(
        session.waitForText('definitely-not-present', { timeout: 20 })
      ).rejects.toBeInstanceOf(TimeoutError)

      await session.stop()

      const exit = await session.waitForExit()
      expect(exit).toHaveProperty('exitCode')
      expect(rawMessages).toContain('screen.patch')
    } finally {
      unlistenRaw()
      await client.close()
      await host.close()
    }
  })

  it('reattaches a second client to the same running session', async () => {
    const host = createHostServer()
    const firstClient = await createInProcessClient(host)
    const secondClient = await createInProcessClient(host)

    try {
      const firstSession = await firstClient.startSession(createManagedShellOptions())
      await firstSession.waitForText('PROMPT>')

      const attachedSession = await secondClient.attachSession(firstSession.id)
      await attachedSession.waitForText('PROMPT>')

      await firstSession.keyboard.type('echo attached-sdk')
      await firstSession.keyboard.press('Enter')
      await attachedSession.waitForText('attached-sdk')

      expect(attachedSession.screen.visibleText()).toContain('attached-sdk')

      await firstSession.stop()

      const [firstExit, secondExit] = await Promise.all([
        firstSession.waitForExit(),
        attachedSession.waitForExit()
      ])

      expect(firstExit).toHaveProperty('signal')
      expect(secondExit).toHaveProperty('signal')
    } finally {
      await firstClient.close()
      await secondClient.close()
      await host.close()
    }
  })
})
