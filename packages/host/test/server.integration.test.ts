import { describe, expect, it } from 'vitest'

import { PROTOCOL_VERSION } from '@terminal-use/protocol'

import { createHostServer } from '../src/index.js'
import { attachInbox, expectStarted, waitForScreenText } from './helpers.js'

describe('HostServer integration', () => {
  it('starts a managed bash session and runs a command through the in-process transport', async () => {
    const host = createHostServer()
    const connection = host.createConnection()
    const inbox = attachInbox(connection)

    try {
      await connection.send({
        v: PROTOCOL_VERSION,
        id: 'hello-1',
        type: 'hello',
        payload: {
          clientName: 'vitest'
        }
      })

      const hello = await inbox.waitFor(
        (message) => message.type === 'hello.ok' && message.id === 'hello-1'
      )
      expect(hello.type).toBe('hello.ok')

      await connection.send({
        v: PROTOCOL_VERSION,
        id: 'start-1',
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

      const started = await inbox.waitFor(
        (message) => message.type === 'session.started' && message.id === 'start-1'
      )
      expectStarted(started)
      const sessionId = started.payload.sessionId

      await waitForScreenText(connection, inbox, sessionId, 'PROMPT>')

      await connection.send({
        v: PROTOCOL_VERSION,
        sessionId,
        type: 'input.text',
        payload: {
          text: 'echo hello-from-shell'
        }
      })
      await connection.send({
        v: PROTOCOL_VERSION,
        sessionId,
        type: 'input.key',
        payload: {
          key: 'Enter'
        }
      })

      const snapshot = await waitForScreenText(
        connection,
        inbox,
        sessionId,
        'hello-from-shell'
      )

      expect(
        snapshot.plainTextLines.some((line) => line.includes('hello-from-shell'))
      ).toBe(true)

      await connection.send({
        v: PROTOCOL_VERSION,
        sessionId,
        type: 'session.stop',
        payload: {}
      })

      const exited = await inbox.waitFor(
        (message) => message.type === 'session.exited' && message.sessionId === sessionId
      )
      expect(exited.type).toBe('session.exited')
    } finally {
      await connection.close()
      await host.close()
    }
  })

  it('reattaches in memory and broadcasts resize snapshots to both clients', async () => {
    const host = createHostServer()
    const first = host.createConnection()
    const second = host.createConnection()
    const firstInbox = attachInbox(first)
    const secondInbox = attachInbox(second)

    try {
      await first.send({
        v: PROTOCOL_VERSION,
        id: 'start-2',
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

      const started = await firstInbox.waitFor(
        (message) => message.type === 'session.started' && message.id === 'start-2'
      )
      expectStarted(started)
      const sessionId = started.payload.sessionId

      await waitForScreenText(first, firstInbox, sessionId, 'PROMPT>')

      await second.send({
        v: PROTOCOL_VERSION,
        id: 'attach-1',
        type: 'session.attach',
        payload: {
          sessionId
        }
      })

      const attachSnapshot = await secondInbox.waitFor(
        (message) =>
          message.type === 'screen.snapshot' &&
          message.id === 'attach-1' &&
          message.sessionId === sessionId
      )
      expect(attachSnapshot.type).toBe('screen.snapshot')
      expect(
        attachSnapshot.payload.plainTextLines.some((line) => line.includes('PROMPT>'))
      ).toBe(true)

      await first.send({
        v: PROTOCOL_VERSION,
        sessionId,
        type: 'session.resize',
        payload: {
          cols: 100,
          rows: 30
        }
      })

      const resizedFirst = await firstInbox.waitFor(
        (message) =>
          message.type === 'screen.snapshot' &&
          message.sessionId === sessionId &&
          message.payload.cols === 100 &&
          message.payload.rows === 30
      )
      const resizedSecond = await secondInbox.waitFor(
        (message) =>
          message.type === 'screen.snapshot' &&
          message.sessionId === sessionId &&
          message.payload.cols === 100 &&
          message.payload.rows === 30
      )

      expect(resizedFirst.type).toBe('screen.snapshot')
      expect(resizedSecond.type).toBe('screen.snapshot')
    } finally {
      await first.close()
      await second.close()
      await host.close()
    }
  })

  it('returns protocol errors for unsupported keys', async () => {
    const host = createHostServer()
    const connection = host.createConnection()
    const inbox = attachInbox(connection)

    try {
      await connection.send({
        v: PROTOCOL_VERSION,
        id: 'start-3',
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

      const started = await firstStarted(inbox, 'start-3')
      const sessionId = started.payload.sessionId

      await connection.send({
        v: PROTOCOL_VERSION,
        id: 'bad-key',
        sessionId,
        type: 'input.key',
        payload: {
          key: 'F5'
        }
      })

      const error = await inbox.waitFor(
        (message) => message.type === 'error' && message.id === 'bad-key'
      )
      expect(error.type).toBe('error')
      expect(error.payload.code).toBe('HOST_ERROR')
    } finally {
      await connection.close()
      await host.close()
    }
  })
})

async function firstStarted(inbox: ReturnType<typeof attachInbox>, id: string) {
  const started = await inbox.waitFor(
    (message) => message.type === 'session.started' && message.id === id
  )
  expectStarted(started)
  return started
}
