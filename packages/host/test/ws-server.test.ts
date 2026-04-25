import { once } from 'node:events'

import { describe, expect, it } from 'vitest'
import WebSocket from 'ws'

import type { HostToClientMessage } from '@terminal-use/protocol'
import { PROTOCOL_VERSION } from '@terminal-use/protocol'

import { createHostServer } from '../src/index.js'

describe('HostWebSocketServer', () => {
  it('round-trips protocol messages over WebSocket', async () => {
    const host = createHostServer()
    const wsServer = await host.startWebSocketServer({
      host: '127.0.0.1',
      port: 0,
      path: '/ws'
    })
    const address = wsServer.address()
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`)
    const inbox = new WsInbox(socket)

    try {
      await once(socket, 'open')

      socket.send(
        JSON.stringify({
          v: PROTOCOL_VERSION,
          id: 'ws-hello',
          type: 'hello',
          payload: {}
        })
      )

      const hello = await inbox.waitFor(
        (message) => message.type === 'hello.ok' && message.id === 'ws-hello'
      )
      expect(hello.type).toBe('hello.ok')

      socket.send(
        JSON.stringify({
          v: PROTOCOL_VERSION,
          id: 'ws-start',
          type: 'session.start',
          payload: {
            command: 'bash',
            args: ['--noprofile', '--norc', '-i'],
            env: {
              PS1: 'PROMPT> '
            },
            cols: 80,
            rows: 24
          }
        })
      )

      const started = await inbox.waitFor(
        (message) => message.type === 'session.started' && message.id === 'ws-start'
      )
      expect(started.type).toBe('session.started')

      socket.send(
        JSON.stringify({
          v: PROTOCOL_VERSION,
          sessionId: started.payload.sessionId,
          type: 'session.stop',
          payload: {}
        })
      )

      const exited = await inbox.waitFor(
        (message) =>
          message.type === 'session.exited' &&
          message.sessionId === started.payload.sessionId
      )
      expect(exited.type).toBe('session.exited')
    } finally {
      socket.close()
      await host.close()
    }
  })

  it('returns protocol errors for invalid JSON payloads', async () => {
    const host = createHostServer()
    const wsServer = await host.startWebSocketServer({
      host: '127.0.0.1',
      port: 0,
      path: '/ws'
    })
    const address = wsServer.address()
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`)
    const inbox = new WsInbox(socket)

    try {
      await once(socket, 'open')
      socket.send('{')

      const error = await inbox.waitFor((message) => message.type === 'error')
      expect(error.type).toBe('error')
      expect(error.payload.code).toBe('WS_PARSE_ERROR')
    } finally {
      socket.close()
      await host.close()
    }
  })
})

class WsInbox {
  readonly messages: HostToClientMessage[] = []

  private readonly waiters = new Set<{
    predicate: (message: HostToClientMessage) => boolean
    resolve: (message: HostToClientMessage) => void
  }>()

  constructor(socket: WebSocket) {
    socket.on('message', (data) => {
      const message = JSON.parse(data.toString()) as HostToClientMessage
      this.messages.push(message)

      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(message)) {
          this.waiters.delete(waiter)
          waiter.resolve(message)
        }
      }
    })
  }

  waitFor(
    predicate: (message: HostToClientMessage) => boolean,
    timeoutMs = 5000
  ): Promise<HostToClientMessage> {
    const existing = this.messages.find(predicate)

    if (existing) {
      return Promise.resolve(existing)
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiters.delete(waiter)
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for ws message`))
      }, timeoutMs)
      const waiter = {
        predicate,
        resolve: (message: HostToClientMessage) => {
          clearTimeout(timeout)
          resolve(message)
        }
      }

      this.waiters.add(waiter)
    })
  }
}
