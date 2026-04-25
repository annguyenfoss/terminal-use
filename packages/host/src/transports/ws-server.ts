import type { AddressInfo } from 'node:net'
import { randomUUID } from 'node:crypto'

import type { HostToClientMessage } from '@terminal-use/protocol'
import { PROTOCOL_VERSION } from '@terminal-use/protocol'
import { WebSocketServer } from 'ws'
import type WebSocket from 'ws'

import type { ConnectionSink } from '../session-manager.js'
import { createErrorEnvelope, type SessionManager } from '../session-manager.js'

export interface WsServerOptions {
  host?: string
  port?: number
  path?: string
}

export class HostWebSocketServer {
  readonly options: Required<WsServerOptions>

  private readonly sessionManager: SessionManager
  private readonly server: WebSocketServer
  private readonly sockets = new Map<string, WsConnection>()
  private readonly ready: Promise<void>

  constructor(sessionManager: SessionManager, options: WsServerOptions = {}) {
    this.sessionManager = sessionManager
    this.options = {
      host: options.host ?? '127.0.0.1',
      port: options.port ?? 0,
      path: options.path ?? '/ws'
    }
    this.server = new WebSocketServer({
      host: this.options.host,
      port: this.options.port,
      path: this.options.path
    })
    this.ready = new Promise((resolve, reject) => {
      this.server.once('listening', () => resolve())
      this.server.once('error', (error) => reject(error))
    })
    this.server.on('connection', (socket) => {
      const connection = createWsConnection(socket)
      this.sockets.set(connection.id, connection)
      this.sessionManager.registerConnection(connection)

      socket.on('message', (raw) => {
        void this.handleSocketMessage(connection, raw.toString())
      })
      socket.on('close', () => {
        this.sockets.delete(connection.id)
        this.sessionManager.detachConnection(connection.id)
      })
    })
  }

  async waitUntilReady(): Promise<void> {
    await this.ready
  }

  address(): AddressInfo {
    const address = this.server.address()

    if (!address || typeof address === 'string') {
      throw new Error('WebSocket server address is unavailable')
    }

    return address
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.sockets.values()].map((socket) => socket.close?.() ?? Promise.resolve())
    )
    await new Promise<void>((resolve, reject) => {
      this.server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }

  private async handleSocketMessage(
    connection: ConnectionSink,
    raw: string
  ): Promise<void> {
    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch {
      await connection.deliver(
        createErrorEnvelope('WS_PARSE_ERROR', 'Invalid JSON payload')
      )
      return
    }

    try {
      const message = this.sessionManager.parseClientMessage(parsed)
      await this.sessionManager.handleClientMessage(connection, message)
    } catch (error) {
      await connection.deliver(
        createErrorEnvelope(
          'INVALID_MESSAGE',
          error instanceof Error ? error.message : 'Invalid client message'
        )
      )
    }
  }
}

function createWsConnection(socket: WebSocket): ConnectionSink & {
  close(): Promise<void>
} {
  return {
    id: randomUUID(),
    async deliver(message: HostToClientMessage) {
      socket.send(JSON.stringify(message))
    },
    async close() {
      socket.close(1000, 'server closing')
    }
  }
}

type WsConnection = ConnectionSink & {
  close(): Promise<void>
}

export function createRawErrorMessage(message: string): HostToClientMessage {
  return {
    v: PROTOCOL_VERSION,
    type: 'error',
    payload: {
      code: 'WS_ERROR',
      message
    }
  }
}
