import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import type {
  HostToClientMessage,
  ScreenSnapshot,
  SessionStarted
} from '@terminal-use/protocol'

import { PROTOCOL_VERSION } from '@terminal-use/protocol'
import type { InProcessConnection } from '../src/index.js'

export class MessageInbox {
  readonly messages: HostToClientMessage[] = []

  private readonly waiters = new Set<{
    predicate: (message: HostToClientMessage) => boolean
    resolve: (message: HostToClientMessage) => void
  }>()

  push(message: HostToClientMessage): void {
    this.messages.push(message)

    for (const waiter of [...this.waiters]) {
      if (waiter.predicate(message)) {
        this.waiters.delete(waiter)
        waiter.resolve(message)
      }
    }
  }

  waitFor(
    predicate: (message: HostToClientMessage) => boolean,
    timeoutMs = 5000
  ): Promise<HostToClientMessage> {
    const existing = this.messages.find(predicate)

    if (existing) {
      return Promise.resolve(existing)
    }

    return Promise.race([
      new Promise<HostToClientMessage>((resolve) => {
        this.waiters.add({ predicate, resolve })
      }),
      delay(timeoutMs).then(() => {
        throw new Error(`Timed out after ${timeoutMs}ms waiting for message`)
      })
    ])
  }
}

export function attachInbox(connection: InProcessConnection): MessageInbox {
  const inbox = new MessageInbox()
  connection.onMessage((message) => {
    inbox.push(message)
  })
  return inbox
}

export async function waitForScreenText(
  connection: InProcessConnection,
  inbox: MessageInbox,
  sessionId: string,
  text: string,
  timeoutMs = 5000
): Promise<ScreenSnapshot> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const requestId = randomUUID()
    await connection.send({
      v: PROTOCOL_VERSION,
      id: requestId,
      sessionId,
      type: 'screen.get',
      payload: {}
    })
    const snapshot = (await inbox.waitFor(
      (message) =>
        message.type === 'screen.snapshot' &&
        message.id === requestId &&
        message.sessionId === sessionId,
      1000
    )) as Extract<HostToClientMessage, { type: 'screen.snapshot' }>

    if (snapshot.payload.plainTextLines.some((line) => line.includes(text))) {
      return snapshot.payload
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for screen text: ${text}`)
}

export function expectStarted(
  message: HostToClientMessage
): asserts message is SessionStarted {
  if (message.type !== 'session.started') {
    throw new Error(`Expected session.started, received ${message.type}`)
  }
}
