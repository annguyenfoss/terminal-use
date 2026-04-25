import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import type { Driver, DriverIO } from '@project-gateway/driver-kit'
import type {
  ActionInvoke,
  ActionResult,
  ClientToHostMessage,
  ErrorMessage,
  HostToClientMessage,
  InputKey,
  QueryResult,
  RawEvent,
  RawEventPayload,
  RecordingStart,
  RecordingStarted,
  RecordingStopped,
  ScreenSnapshot,
  SemanticEvent,
  SessionAttach,
  SessionExited,
  SessionResize,
  SessionStarted
} from '@project-gateway/protocol'
import { PROTOCOL_VERSION, clientToHostMessageSchema } from '@project-gateway/protocol'

import { DriverRuntime } from './driver-runtime.js'
import { DriverStateStore } from './driver-state-store.js'
import { PtySession } from './pty-session.js'
import { RecordingStore } from './recording-store.js'
import { SessionRegistry, type SessionRecord } from './session-registry.js'
import { TerminalState } from './terminal-state.js'
import { createManagedTempEnv } from './temp-env.js'

export interface ManagedShellLaunchOptions {
  profile?: string
  profileArgs?: unknown
  command?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  rows?: number
  cols?: number
  driver?: string
}

export interface ManagedLaunchProfile {
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  rows?: number
  cols?: number
  driver?: string
}

export interface ManagedLaunchProfileResolverContext {
  profile: string
  profileArgs?: unknown
}

export type ManagedLaunchProfileResolver = (
  context: ManagedLaunchProfileResolverContext
) => Promise<ManagedLaunchProfile> | ManagedLaunchProfile

export type ManagedLaunchProfileDefinition =
  | ManagedLaunchProfile
  | ManagedLaunchProfileResolver

export interface SessionManagerOptions {
  shellCommand?: string
  shellArgs?: string[]
  defaultCols: number
  defaultRows: number
  tempRoot?: string
  drivers?: Driver[]
  launchProfiles?: Record<string, ManagedLaunchProfileDefinition>
}

export interface ConnectionSink {
  id: string
  deliver(message: HostToClientMessage): Promise<void>
}

export interface HostSessionStartResult {
  started: SessionStarted
  snapshot: ScreenSnapshot
}

export class SessionManager {
  private readonly registry = new SessionRegistry()
  private readonly connections = new Map<string, ConnectionSink>()
  private readonly options: SessionManagerOptions
  private readonly driverRuntime: DriverRuntime
  private readonly driverStateStore = new DriverStateStore()
  private readonly recordingStore: RecordingStore

  constructor(options: SessionManagerOptions) {
    this.options = options
    this.driverRuntime = new DriverRuntime(options.drivers ?? [])
    this.recordingStore = new RecordingStore({
      tempRoot: options.tempRoot
    })
  }

  registerConnection(connection: ConnectionSink): void {
    this.connections.set(connection.id, connection)
  }

  detachConnection(connectionId: string): void {
    this.connections.delete(connectionId)
    this.registry.detachConnection(connectionId)
  }

  async handleClientMessage(
    connection: ConnectionSink,
    message: ClientToHostMessage
  ): Promise<void> {
    switch (message.type) {
      case 'hello':
        await connection.deliver({
          v: PROTOCOL_VERSION,
          id: message.id,
          sessionId: message.sessionId,
          type: 'hello.ok',
          payload: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {}
          }
        })
        return
      case 'session.start': {
        const result = await this.startSession(message.payload, connection.id)
        await connection.deliver({
          ...result.started,
          id: message.id
        })
        await connection.deliver({
          v: PROTOCOL_VERSION,
          id: message.id,
          sessionId: result.started.payload.sessionId,
          type: 'screen.snapshot',
          payload: result.snapshot
        })
        return
      }
      case 'session.attach':
        await connection.deliver(this.attachSession(message, connection.id))
        return
      case 'session.stop':
        await this.stopSession(this.requireSessionId(message))
        return
      case 'session.resize': {
        const sessionId = this.requireSessionId(message)
        const snapshotEnvelope = await this.resizeSession(
          sessionId,
          message.payload,
          message.id
        )
        await this.broadcast(sessionId, snapshotEnvelope)
        return
      }
      case 'input.key':
        await this.sendKey(this.requireSessionId(message), message.payload)
        return
      case 'input.text':
        await this.sendText(this.requireSessionId(message), message.payload.text)
        return
      case 'input.paste':
        await this.sendPaste(this.requireSessionId(message), message.payload.text)
        return
      case 'screen.get':
        await connection.deliver({
          v: PROTOCOL_VERSION,
          id: message.id,
          sessionId: this.requireSessionId(message),
          type: 'screen.snapshot',
          payload: this.getSnapshot(this.requireSessionId(message))
        })
        return
      case 'query.run':
        await connection.deliver(
          this.runQuery(this.requireSessionId(message), message)
        )
        return
      case 'action.invoke':
        await connection.deliver(
          await this.runAction(this.requireSessionId(message), message)
        )
        return
      case 'recording.start':
        await connection.deliver(
          await this.startRecording(this.requireSessionId(message), message)
        )
        return
      case 'recording.stop':
        await connection.deliver(
          await this.stopRecording(this.requireSessionId(message), message.id)
        )
        return
    }

    return assertNever(message)
  }

  async startSession(
    options: ManagedShellLaunchOptions = {},
    connectionId?: string
  ): Promise<HostSessionStartResult> {
    const launch = await resolveLaunchOptions(options, this.options)
    const sessionId = randomUUID()
    const tempEnv = await createManagedTempEnv({
      tempRoot: this.options.tempRoot,
      envOverrides: launch.env,
      prompt: launch.prompt
    })

    const pty = new PtySession({
      command: launch.command,
      args: launch.args,
      cwd: launch.cwd,
      env: tempEnv.env,
      cols: launch.cols,
      rows: launch.rows
    })
    const terminalState = new TerminalState(launch.cols, launch.rows)

    const record = this.registry.create({
      id: sessionId,
      profile: launch.profile,
      command: launch.command,
      args: launch.args,
      cwd: launch.cwd,
      driver: launch.driver,
      pty,
      terminalState,
      tempEnv,
      subscribers: new Set(connectionId ? [connectionId] : []),
      startedAt: Date.now(),
      exit: null
    })

    pty.onData((data) => {
      void this.handlePtyData(record, data)
    })
    pty.onExit((exit) => {
      void this.handleSessionExit(record.id, exit)
    })

    return {
      started: {
        v: PROTOCOL_VERSION,
        sessionId,
        type: 'session.started',
        payload: {
          sessionId,
          profile: launch.profile,
          command: launch.command,
          args: launch.args,
          cols: launch.cols,
          rows: launch.rows,
          driver: launch.driver
        }
      },
      snapshot: terminalState.snapshot
    }
  }

  attachSession(message: SessionAttach, connectionId: string): HostToClientMessage {
    const session = this.registry.attach(message.payload.sessionId, connectionId)

    if (session.exit) {
      throw new Error(`Cannot attach to exited session: ${session.id}`)
    }

    return {
      v: PROTOCOL_VERSION,
      id: message.id,
      sessionId: session.id,
      type: 'screen.snapshot',
      payload: session.terminalState.snapshot
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.registry.require(sessionId)
    session.pty.stop()
  }

  async resizeSession(
    sessionId: string,
    payload: SessionResize['payload'],
    requestId?: string
  ): Promise<HostToClientMessage> {
    const session = this.registry.require(sessionId)

    session.pty.resize(payload.cols, payload.rows)
    const at = Date.now()
    await this.emitRawEvent(session.id, {
      kind: 'resize',
      at,
      cols: payload.cols,
      rows: payload.rows
    })

    const change = await session.terminalState.resize(payload.cols, payload.rows)
    const snapshot = change?.snapshot ?? session.terminalState.snapshot

    await this.emitSnapshotCheckpoint(session, snapshot, at)
    await this.updateSemanticState(session, snapshot, at)

    return {
      v: PROTOCOL_VERSION,
      id: requestId,
      sessionId: session.id,
      type: 'screen.snapshot',
      payload: snapshot
    }
  }

  async sendText(sessionId: string, text: string): Promise<void> {
    const session = this.requireRunningSession(sessionId)
    session.pty.write(text)
    await this.emitRawEvent(sessionId, {
      kind: 'input',
      at: Date.now(),
      inputType: 'text',
      data: text
    })
  }

  async sendPaste(sessionId: string, text: string): Promise<void> {
    const session = this.requireRunningSession(sessionId)
    const wrapped = session.terminalState.modes.bracketedPasteMode
      ? `\u001b[200~${text}\u001b[201~`
      : text
    session.pty.write(wrapped)
    await this.emitRawEvent(sessionId, {
      kind: 'input',
      at: Date.now(),
      inputType: 'paste',
      data: wrapped
    })
  }

  async sendKey(sessionId: string, payload: InputKey['payload']): Promise<void> {
    const session = this.requireRunningSession(sessionId)
    const sequence = encodeInputKey(payload.key)

    if (!sequence) {
      throw new Error(`Unsupported key: ${payload.key}`)
    }

    session.pty.write(sequence)
    await this.emitRawEvent(sessionId, {
      kind: 'input',
      at: Date.now(),
      inputType: 'key',
      data: sequence,
      key: payload.key
    })
  }

  getSnapshot(sessionId: string): ScreenSnapshot {
    const session = this.registry.require(sessionId)
    return session.terminalState.snapshot
  }

  parseClientMessage(message: unknown): ClientToHostMessage {
    return clientToHostMessageSchema.parse(message)
  }

  async close(): Promise<void> {
    const sessions = this.registry.all()

    for (const session of sessions) {
      await this.stopRecording(session.id).catch(() => undefined)
      session.pty.dispose()
      session.terminalState.dispose()
      await session.tempEnv.cleanup()
      this.driverStateStore.delete(session.id)
      this.registry.delete(session.id)
    }

    this.connections.clear()
  }

  private requireRunningSession(sessionId: string): SessionRecord {
    const session = this.registry.require(sessionId)

    if (session.exit) {
      throw new Error(`Session exited: ${sessionId}`)
    }

    return session
  }

  private async handlePtyData(session: SessionRecord, data: string): Promise<void> {
    const at = Date.now()
    await this.emitRawEvent(session.id, {
      kind: 'pty-output',
      at,
      data
    })

    const change = await session.terminalState.ingest(data)

    if (!change) {
      return
    }

    if (change.patch) {
      await this.broadcast(session.id, {
        v: PROTOCOL_VERSION,
        sessionId: session.id,
        type: 'screen.patch',
        payload: change.patch
      })
    }

    await this.emitSnapshotCheckpoint(session, change.snapshot, at)
    await this.updateSemanticState(session, change.snapshot, at)
  }

  private async handleSessionExit(
    sessionId: string,
    exit: { exitCode: number; signal: string | null }
  ): Promise<void> {
    const existing = this.registry.get(sessionId)

    if (!existing) {
      return
    }

    const session = this.registry.markExited(sessionId, exit)
    const at = Date.now()

    await this.emitRawEvent(sessionId, {
      kind: 'session-exit',
      at,
      exitCode: exit.exitCode,
      signal: exit.signal
    })

    const recordingStopped = await this.stopRecording(sessionId).catch(
      () => null as RecordingStopped | null
    )

    if (recordingStopped) {
      await this.broadcast(sessionId, recordingStopped)
    }

    const message: SessionExited = {
      v: PROTOCOL_VERSION,
      sessionId,
      type: 'session.exited',
      payload: {
        exitCode: exit.exitCode,
        signal: exit.signal
      }
    }

    await this.broadcast(sessionId, message)
    this.driverStateStore.delete(sessionId)
    await session.tempEnv.cleanup()
  }

  private async emitRawEvent(
    sessionId: string,
    payload: RawEventPayload
  ): Promise<void> {
    await this.recordingStore.recordRaw(sessionId, payload)

    const event: RawEvent = {
      v: PROTOCOL_VERSION,
      sessionId,
      type: 'event.raw',
      payload
    }

    await this.broadcast(sessionId, event)
  }

  private async emitSemanticEvent(
    sessionId: string,
    payload: SemanticEvent['payload']
  ): Promise<void> {
    await this.recordingStore.recordSemantic(sessionId, payload)

    await this.broadcast(sessionId, {
      v: PROTOCOL_VERSION,
      sessionId,
      type: 'event.semantic',
      payload
    })
  }

  private async emitSnapshotCheckpoint(
    session: SessionRecord,
    snapshot: ScreenSnapshot,
    at: number
  ): Promise<void> {
    await this.recordingStore.recordSnapshot(session.id, snapshot, at)
    await this.emitRawEvent(session.id, {
      kind: 'snapshot',
      at,
      revision: snapshot.revision
    })
  }

  private async updateSemanticState(
    session: SessionRecord,
    snapshot: ScreenSnapshot,
    at: number
  ): Promise<void> {
    const previous = this.driverStateStore.get(session.id)
    const evaluation = this.driverRuntime.evaluate({
      snapshot,
      preferredDriverId: session.driver,
      at
    })
    const result = this.driverStateStore.upsert(session.id, {
      driver: evaluation.driver,
      payload: evaluation.payload
    })

    if (!evaluation.payload.driverId && !previous) {
      return
    }

    if (!result.changed) {
      return
    }

    await this.emitSemanticEvent(session.id, result.current.payload)
  }

  private runQuery(
    sessionId: string,
    message: Extract<ClientToHostMessage, { type: 'query.run' }>
  ): QueryResult {
    const result = this.driverRuntime.runQuery(
      sessionId,
      this.driverStateStore,
      message.payload.name,
      message.payload.args,
      message.payload.driver
    )

    return {
      v: PROTOCOL_VERSION,
      id: message.id,
      sessionId,
      type: 'query.result',
      payload: result
    }
  }

  private async runAction(
    sessionId: string,
    message: ActionInvoke
  ): Promise<ActionResult & HostToClientMessage> {
    const payload = await this.driverRuntime.invoke(
      sessionId,
      {
        driver: message.payload.driver,
        name: message.payload.name,
        args: message.payload.args
      },
      this.createDriverIo(sessionId),
      this.driverStateStore
    )

    return {
      v: PROTOCOL_VERSION,
      id: message.id,
      sessionId,
      type: 'action.result',
      payload
    } as ActionResult & HostToClientMessage
  }

  private async startRecording(
    sessionId: string,
    message: RecordingStart
  ): Promise<RecordingStarted> {
    const session = this.requireRunningSession(sessionId)

    return this.recordingStore.start({
      session,
      request: message,
      snapshot: session.terminalState.snapshot,
      semanticEvent: this.driverStateStore.get(session.id)?.payload ?? null
    })
  }

  private async stopRecording(
    sessionId: string,
    requestId?: string
  ): Promise<RecordingStopped> {
    const session = this.registry.require(sessionId)
    return this.recordingStore.stop(session, {
      id: requestId
    })
  }

  private createDriverIo(sessionId: string): DriverIO {
    return {
      getSnapshot: () => this.getSnapshot(sessionId),
      refreshSnapshot: async () => this.getSnapshot(sessionId),
      type: async (text) => {
        await this.sendText(sessionId, text)
      },
      paste: async (text) => {
        await this.sendPaste(sessionId, text)
      },
      press: async (key) => {
        if (encodeInputKey(key)) {
          await this.sendKey(sessionId, { key })
          return
        }

        if (key.length === 1) {
          await this.sendText(sessionId, key)
          return
        }

        throw new Error(`Unsupported driver key: ${key}`)
      },
      waitForChange: async (options = {}) => {
        const baseline = this.getSnapshot(sessionId).revision
        const timeoutMs = options.timeout ?? 1000
        const deadline = Date.now() + timeoutMs

        while (Date.now() <= deadline) {
          const snapshot = this.getSnapshot(sessionId)

          if (snapshot.revision > baseline) {
            return snapshot
          }

          await delay(20)
        }

        throw new Error(`Timed out waiting for session change: ${sessionId}`)
      }
    }
  }

  private async broadcast(
    sessionId: string,
    message: HostToClientMessage
  ): Promise<void> {
    const session = this.registry.get(sessionId)

    if (!session) {
      return
    }

    const deliveries: Promise<void>[] = []

    for (const connectionId of session.subscribers) {
      const connection = this.connections.get(connectionId)

      if (connection) {
        deliveries.push(connection.deliver(message))
      }
    }

    await Promise.all(deliveries)
  }

  private requireSessionId(message: { sessionId?: string }): string {
    if (!message.sessionId) {
      throw new Error('sessionId is required')
    }

    return message.sessionId
  }
}

export function encodeInputKey(key: string): string | null {
  const normalized = key.trim()
  const lookup: Record<string, string> = {
    Enter: '\r',
    Tab: '\t',
    Backspace: '\x7f',
    Escape: '\x1b',
    Up: '\x1b[A',
    Down: '\x1b[B',
    Right: '\x1b[C',
    Left: '\x1b[D',
    Home: '\x1b[H',
    End: '\x1b[F',
    PageUp: '\x1b[5~',
    PageDown: '\x1b[6~',
    'Ctrl+A': '\x01',
    'Ctrl+G': '\x07',
    'Ctrl+K': '\x0b',
    'Ctrl+C': '\x03',
    'Ctrl+D': '\x04',
    'Ctrl+E': '\x05',
    'Ctrl+Q': '\x11',
    'Ctrl+S': '\x13',
    'Ctrl+L': '\x0c',
    'Ctrl+O': '\x0f',
    'Ctrl+R': '\x12',
    'Ctrl+T': '\x14',
    'Ctrl+U': '\x15',
    'Ctrl+V': '\x16',
    'Ctrl+W': '\x17',
    'Ctrl+X': '\x18',
    'Ctrl+Y': '\x19',
    'Ctrl+Z': '\x1a',
    'Ctrl+\\': '\x1c',
    'Ctrl+]': '\x1d',
    'Ctrl+6': '\x1e',
    'Ctrl+/': '\x1f',
    'Ctrl+_': '\x1f'
  }

  return lookup[normalized] ?? null
}

export function createErrorEnvelope(
  code: string,
  message: string,
  request?: { id?: string; sessionId?: string }
): ErrorMessage {
  return {
    v: PROTOCOL_VERSION,
    id: request?.id,
    sessionId: request?.sessionId,
    type: 'error',
    payload: {
      code,
      message
    }
  }
}

interface ResolvedLaunchOptions {
  profile?: string
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
  cols: number
  rows: number
  driver?: string
  prompt?: string
}

async function resolveLaunchOptions(
  options: ManagedShellLaunchOptions,
  defaults: SessionManagerOptions
): Promise<ResolvedLaunchOptions> {
  if (options.profile) {
    const profileDefinition = defaults.launchProfiles?.[options.profile]

    if (!profileDefinition) {
      throw new Error(`Unknown launch profile: ${options.profile}`)
    }

    if (
      options.command ||
      (options.args && options.args.length > 0) ||
      options.cwd ||
      options.env
    ) {
      throw new Error(
        `Launch profile ${options.profile} cannot be combined with command, args, cwd, or env`
      )
    }

    const profile =
      typeof profileDefinition === 'function'
        ? await profileDefinition({
            profile: options.profile,
            profileArgs: options.profileArgs
          })
        : profileDefinition

    return {
      profile: options.profile,
      command: profile.command,
      args: profile.args ?? [],
      cwd: profile.cwd,
      env: profile.env,
      cols: options.cols ?? profile.cols ?? defaults.defaultCols,
      rows: options.rows ?? profile.rows ?? defaults.defaultRows,
      driver: profile.driver ?? options.driver,
      prompt: undefined
    }
  }

  if (options.profileArgs !== undefined) {
    throw new Error('profileArgs can only be used with a managed launch profile')
  }

  const cols = options.cols ?? defaults.defaultCols
  const rows = options.rows ?? defaults.defaultRows

  if (options.command) {
    const isBash = basename(options.command).includes('bash')

    return {
      command: options.command,
      args: options.args ?? [],
      cwd: options.cwd,
      env: options.env,
      cols,
      rows,
      driver: options.driver,
      prompt: isBash ? options.env?.PS1 ?? 'PROMPT> ' : undefined
    }
  }

  const bashCommand = defaults.shellCommand ?? 'bash'
  const bashArgs = defaults.shellArgs ?? ['--noprofile', '--norc', '-i']

  return {
    command: bashCommand,
    args: bashArgs,
    cwd: options.cwd,
    env: options.env,
    cols,
    rows,
    driver: options.driver,
    prompt: 'PROMPT> '
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`)
}
