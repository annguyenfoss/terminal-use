import { describe, expect, it } from 'vitest'

import { createHostServer } from '../../host/src/index.js'
import { connectWebSocket } from '../src/index.js'
import { createManagedShellOptions } from './helpers.js'

describe('SDK WebSocket transport', () => {
  it('drives a shell over the remote transport', async () => {
    const host = createHostServer()
    const wsServer = await host.startWebSocketServer({
      host: '127.0.0.1',
      port: 0,
      path: '/sdk'
    })
    const address = wsServer.address()
    const client = await connectWebSocket(`ws://127.0.0.1:${address.port}/sdk`)

    try {
      const session = await client.startSession(createManagedShellOptions())

      await session.waitForText('PROMPT>')
      await session.keyboard.type('echo sdk-ws')
      await session.keyboard.press('Enter')
      await session.waitForText('sdk-ws')

      expect(session.screen.visibleText()).toContain('sdk-ws')

      await session.stop()

      const exit = await session.waitForExit()
      expect(exit).toHaveProperty('exitCode')
    } finally {
      await client.close()
      await host.close()
    }
  })
})
