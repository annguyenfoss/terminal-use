import { randomUUID } from 'node:crypto'

import type { Driver } from '@terminal-use/driver-kit'
import type { HostToClientMessage, ScreenSnapshot } from '@terminal-use/protocol'

import {
  createErrorEnvelope,
  SessionManager,
  type HostSessionStartResult,
  type ManagedLaunchProfileDefinition,
  type ManagedLaunchProfile,
  type ManagedLaunchProfileResolver,
  type ManagedLaunchProfileResolverContext,
  type ManagedShellLaunchOptions
} from './session-manager.js'
import { InProcessConnection } from './transports/in-process.js'
import {
  HostWebSocketServer,
  type WsServerOptions
} from './transports/ws-server.js'

export interface HostServerOptions {
  shellCommand?: string
  shellArgs?: string[]
  defaultCols?: number
  defaultRows?: number
  tempRoot?: string
  drivers?: Driver[]
  launchProfiles?: Record<string, ManagedLaunchProfileDefinition>
  ws?: WsServerOptions
}

export class HostServer {
  private readonly sessionManager: SessionManager
  private wsServer: HostWebSocketServer | null = null

  constructor(private readonly options: HostServerOptions = {}) {
    this.sessionManager = new SessionManager({
      shellCommand: options.shellCommand,
      shellArgs: options.shellArgs,
      defaultCols: options.defaultCols ?? 120,
      defaultRows: options.defaultRows ?? 40,
      tempRoot: options.tempRoot,
      drivers: options.drivers,
      launchProfiles: options.launchProfiles
    })
  }

  createConnection(): InProcessConnection {
    const connection = new InProcessConnection(
      randomUUID(),
      async (sink, message) => {
        try {
          await this.sessionManager.handleClientMessage(sink, message)
        } catch (error) {
          await sink.deliver(
            createErrorEnvelope(
              'HOST_ERROR',
              error instanceof Error ? error.message : 'Host error',
              message
            )
          )
        }
      },
      (connectionId) => {
        this.sessionManager.detachConnection(connectionId)
      }
    )
    this.sessionManager.registerConnection(connection)
    return connection
  }

  async startSession(
    options: ManagedShellLaunchOptions = {}
  ): Promise<HostSessionStartResult> {
    return this.sessionManager.startSession(options)
  }

  async stopSession(sessionId: string): Promise<void> {
    await this.sessionManager.stopSession(sessionId)
  }

  async resizeSession(
    sessionId: string,
    cols: number,
    rows: number
  ): Promise<HostToClientMessage> {
    return this.sessionManager.resizeSession(sessionId, { cols, rows })
  }

  async inputText(sessionId: string, text: string): Promise<void> {
    await this.sessionManager.sendText(sessionId, text)
  }

  async inputKey(sessionId: string, key: string): Promise<void> {
    await this.sessionManager.sendKey(sessionId, { key })
  }

  async inputPaste(sessionId: string, text: string): Promise<void> {
    await this.sessionManager.sendPaste(sessionId, text)
  }

  getSnapshot(sessionId: string): ScreenSnapshot {
    return this.sessionManager.getSnapshot(sessionId)
  }

  async startWebSocketServer(
    options: WsServerOptions = this.options.ws ?? {}
  ): Promise<HostWebSocketServer> {
    if (this.wsServer) {
      return this.wsServer
    }

    this.wsServer = new HostWebSocketServer(this.sessionManager, options)
    await this.wsServer.waitUntilReady()
    return this.wsServer
  }

  async close(): Promise<void> {
    if (this.wsServer) {
      await this.wsServer.close()
      this.wsServer = null
    }

    await this.sessionManager.close()
  }
}

export function createHostServer(options: HostServerOptions = {}): HostServer {
  return new HostServer(options)
}

export type {
  HostSessionStartResult,
  ManagedLaunchProfileDefinition,
  ManagedLaunchProfile,
  ManagedLaunchProfileResolver,
  ManagedLaunchProfileResolverContext,
  ManagedShellLaunchOptions,
  WsServerOptions
}
