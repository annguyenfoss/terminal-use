import type {
  ClientToHostMessage,
  HostToClientMessage
} from '@terminal-use/protocol'

import type { ConnectionSink } from '../session-manager.js'

type MessageListener = (message: HostToClientMessage) => void
type MessageHandler = (
  connection: ConnectionSink,
  message: ClientToHostMessage
) => Promise<void>
type CloseHandler = (connectionId: string) => void

export class InProcessConnection implements ConnectionSink {
  readonly id: string

  private readonly listeners = new Set<MessageListener>()
  private readonly handleMessage: MessageHandler
  private readonly handleClose: CloseHandler
  private closed = false

  constructor(
    id: string,
    handleMessage: MessageHandler,
    handleClose: CloseHandler
  ) {
    this.id = id
    this.handleMessage = handleMessage
    this.handleClose = handleClose
  }

  async send(message: ClientToHostMessage): Promise<void> {
    if (this.closed) {
      throw new Error(`Connection closed: ${this.id}`)
    }

    await this.handleMessage(this, message)
  }

  onMessage(listener: MessageListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async deliver(message: HostToClientMessage): Promise<void> {
    for (const listener of this.listeners) {
      listener(message)
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }

    this.closed = true
    this.handleClose(this.id)
  }
}
