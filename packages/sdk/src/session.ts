import { randomUUID } from 'node:crypto'

import type { ManagedShellLaunchOptions } from '@terminal-use/host'
import type {
  ClientToHostMessage,
  HostToClientMessage,
  ScreenSnapshot,
  SemanticEvent,
  SessionExited,
  SessionStarted
} from '@terminal-use/protocol'
import { PROTOCOL_VERSION } from '@terminal-use/protocol'

import { SdkDriverClient, unwrapDriverResult, type DriverClient, type DriverQueryName, type DriverStateSnapshot } from './driver-client.js'
import {
  AbortError,
  ConnectionClosedError,
  ProtocolError,
  SessionClosedError,
  TimeoutError,
  protocolErrorFromMessage
} from './errors.js'
import type { Keyboard, SupportedKey } from './keyboard.js'
import { SdkKeyboard } from './keyboard.js'
import type { Locator, TextQuery } from './locator.js'
import { SdkMouse, type Mouse } from './mouse.js'
import {
  SdkScreen,
  applyScreenPatch,
  cloneScreenSnapshot,
  type Screen
} from './screen.js'
import type { TransportConnection } from './transport.js'
import type { WaitOptions } from './wait.js'

type ScreenSnapshotMessage = Extract<HostToClientMessage, { type: 'screen.snapshot' }>
type ScreenPatchMessage = Extract<HostToClientMessage, { type: 'screen.patch' }>
type HelloOkMessage = Extract<HostToClientMessage, { type: 'hello.ok' }>
type SemanticEventMessage = Extract<HostToClientMessage, { type: 'event.semantic' }>
type QueryResultMessage = Extract<HostToClientMessage, { type: 'query.result' }>
type ActionResultMessage = Extract<HostToClientMessage, { type: 'action.result' }>

interface SessionState {
  id: string
  snapshot: ScreenSnapshot | null
  semantic: DriverStateSnapshot | null
  exit: SessionExited['payload'] | null
  connectionError: Error | null
  listeners: Set<() => void>
  session: SdkSession | null
  refreshPromise: Promise<ScreenSnapshot> | null
}

interface MessageWaiter {
  requestId?: string
  predicate: (message: HostToClientMessage) => boolean
  resolve: (message: HostToClientMessage) => void
  reject: (error: Error) => void
  cleanup: () => void
}

export type SessionLaunchOptions = ManagedShellLaunchOptions

export interface GatewayClient {
  startSession(options?: SessionLaunchOptions): Promise<Session>
  attachSession(sessionId: string): Promise<Session>
  close(): Promise<void>
  raw: {
    send(message: ClientToHostMessage): Promise<void>
    onMessage(listener: (message: HostToClientMessage) => void): () => void
  }
}

export interface Session {
  readonly id: string
  readonly screen: Screen
  readonly keyboard: Keyboard
  readonly mouse: Mouse
  locator(query: TextQuery): Locator
  driver(driverId?: string): DriverClient
  waitForText(
    query: TextQuery,
    options?: WaitOptions & { state?: 'visible' | 'hidden' }
  ): Promise<void>
  stop(): Promise<void>
  waitForExit(
    options?: WaitOptions
  ): Promise<{ exitCode: number | null; signal: string | null }>
}

export interface GatewayClientOptions {
  defaultTimeout: number
}

export class SdkClient implements GatewayClient {
  readonly raw: GatewayClient['raw']

  private readonly transport: TransportConnection
  private readonly defaultTimeout: number
  private readonly sessions = new Map<string, SessionState>()
  private readonly waiters = new Set<MessageWaiter>()
  private readonly rawListeners = new Set<(message: HostToClientMessage) => void>()
  private readonly unsubscribeMessage: () => void
  private readonly unsubscribeClose: () => void
  private closeError: Error | null = null
  private closed = false

  constructor(transport: TransportConnection, options: GatewayClientOptions) {
    this.transport = transport
    this.defaultTimeout = options.defaultTimeout
    this.unsubscribeMessage = transport.onMessage((message) => {
      this.handleMessage(message)
    })
    this.unsubscribeClose = transport.onClose((error) => {
      this.handleTransportClose(error)
    })
    this.raw = {
      send: async (message) => {
        this.assertOpen()
        await this.transport.send(message)
      },
      onMessage: (listener) => {
        this.rawListeners.add(listener)
        return () => {
          this.rawListeners.delete(listener)
        }
      }
    }
  }

  async initialize(clientName: string, options: WaitOptions = {}): Promise<void> {
    const requestId = randomUUID()
    const hello = this.waitForMessage<HelloOkMessage>({
      requestId,
      timeout: options.timeout,
      signal: options.signal,
      description: 'hello response',
      predicate: (message): message is HelloOkMessage =>
        message.type === 'hello.ok' && message.id === requestId
    })

    await this.transport.send({
      v: PROTOCOL_VERSION,
      id: requestId,
      type: 'hello',
      payload: {
        clientName
      }
    })

    await hello
  }

  async startSession(options: SessionLaunchOptions = {}): Promise<Session> {
    this.assertOpen()

    const requestId = randomUUID()
    const started = this.waitForMessage<SessionStarted>({
      requestId,
      description: 'session start',
      predicate: (message): message is SessionStarted =>
        message.type === 'session.started' && message.id === requestId
    })
    const snapshot = this.waitForMessage<ScreenSnapshotMessage>({
      requestId,
      description: 'initial session snapshot',
      predicate: (message): message is ScreenSnapshotMessage =>
        message.type === 'screen.snapshot' && message.id === requestId
    })

    await this.transport.send({
      v: PROTOCOL_VERSION,
      id: requestId,
      type: 'session.start',
      payload: toSessionStartPayload(options)
    })

    const [startedMessage, snapshotMessage] = await Promise.all([started, snapshot])

    if (startedMessage.payload.sessionId !== snapshotMessage.sessionId) {
      throw new ConnectionClosedError('Mismatched session start response')
    }

    return this.ensureSession(startedMessage.payload.sessionId)
  }

  async attachSession(sessionId: string): Promise<Session> {
    this.assertOpen()

    const existing = this.sessions.get(sessionId)

    if (existing?.session && !existing.exit) {
      return existing.session
    }

    const requestId = randomUUID()
    const snapshot = this.waitForMessage<ScreenSnapshotMessage>({
      requestId,
      description: `attach session ${sessionId}`,
      predicate: (message): message is ScreenSnapshotMessage =>
        message.type === 'screen.snapshot' &&
        message.id === requestId &&
        message.sessionId === sessionId
    })

    await this.transport.send({
      v: PROTOCOL_VERSION,
      id: requestId,
      type: 'session.attach',
      payload: {
        sessionId
      }
    })

    await snapshot
    return this.ensureSession(sessionId)
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }

    await this.transport.close()
  }

  async refreshSession(
    sessionId: string,
    options: WaitOptions = {}
  ): Promise<ScreenSnapshot> {
    this.requireRunnableSession(sessionId)

    const requestId = randomUUID()
    const snapshot = this.waitForMessage<ScreenSnapshotMessage>({
      requestId,
      timeout: options.timeout,
      signal: options.signal,
      description: `refresh session ${sessionId}`,
      predicate: (message): message is ScreenSnapshotMessage =>
        message.type === 'screen.snapshot' &&
        message.id === requestId &&
        message.sessionId === sessionId
    })

    await this.transport.send({
      v: PROTOCOL_VERSION,
      id: requestId,
      sessionId,
      type: 'screen.get',
      payload: {}
    })

    return snapshot.then(() => {
      const state = this.ensureSessionState(sessionId)

      if (!state.snapshot) {
        throw new ConnectionClosedError(`Session snapshot unavailable: ${sessionId}`)
      }

      return state.snapshot
    })
  }

  async waitForExit(
    sessionId: string,
    options: WaitOptions = {}
  ): Promise<{ exitCode: number | null; signal: string | null }> {
    const state = this.ensureSessionState(sessionId)

    if (state.exit) {
      return state.exit
    }

    const exited = await this.waitForMessage<SessionExited>({
      timeout: options.timeout,
      signal: options.signal,
      description: `session exit ${sessionId}`,
      predicate: (message): message is SessionExited =>
        message.type === 'session.exited' && message.sessionId === sessionId
    })

    return exited.payload
  }

  async stopSession(sessionId: string): Promise<void> {
    this.requireRunnableSession(sessionId)

    await this.transport.send({
      v: PROTOCOL_VERSION,
      sessionId,
      type: 'session.stop',
      payload: {}
    })
  }

  async inputText(sessionId: string, text: string): Promise<void> {
    this.requireRunnableSession(sessionId)

    await this.transport.send({
      v: PROTOCOL_VERSION,
      sessionId,
      type: 'input.text',
      payload: {
        text
      }
    })
  }

  async inputPaste(sessionId: string, text: string): Promise<void> {
    this.requireRunnableSession(sessionId)

    await this.transport.send({
      v: PROTOCOL_VERSION,
      sessionId,
      type: 'input.paste',
      payload: {
        text
      }
    })
  }

  async inputKey(sessionId: string, key: SupportedKey): Promise<void> {
    this.requireRunnableSession(sessionId)

    await this.transport.send({
      v: PROTOCOL_VERSION,
      sessionId,
      type: 'input.key',
      payload: {
        key
      }
    })
  }

  getSnapshot(sessionId: string): ScreenSnapshot {
    const state = this.ensureSessionState(sessionId)

    if (!state.snapshot) {
      throw (
        this.getTerminalError(sessionId) ??
        new ConnectionClosedError(`Session snapshot unavailable: ${sessionId}`)
      )
    }

    return state.snapshot
  }

  getDriverState(sessionId: string): DriverStateSnapshot | null {
    const state = this.ensureSessionState(sessionId)
    return state.semantic ? cloneDriverState(state.semantic) : null
  }

  async queryDriver(
    sessionId: string,
    driverId: string | undefined,
    name: DriverQueryName,
    args?: unknown
  ): Promise<unknown> {
    this.requireRunnableSession(sessionId)

    const requestId = randomUUID()
    const result = this.waitForMessage<QueryResultMessage>({
      requestId,
      description: `driver query ${name}`,
      predicate: (message): message is QueryResultMessage =>
        message.type === 'query.result' &&
        message.id === requestId &&
        message.sessionId === sessionId
    })

    await this.transport.send({
      v: PROTOCOL_VERSION,
      id: requestId,
      sessionId,
      type: 'query.run',
      payload: {
        driver: driverId,
        name,
        args
      }
    })

    return unwrapDriverResult((await result).payload, 'DRIVER_QUERY_FAILED')
  }

  async invokeDriver(
    sessionId: string,
    driverId: string | undefined,
    name: string,
    args?: unknown
  ): Promise<unknown> {
    this.requireRunnableSession(sessionId)

    if (!driverId) {
      throw new ProtocolError(
        'DRIVER_ACTION_FAILED',
        'Driver id is required for invoke()'
      )
    }

    const requestId = randomUUID()
    const result = this.waitForMessage<ActionResultMessage>({
      requestId,
      description: `driver action ${name}`,
      predicate: (message): message is ActionResultMessage =>
        message.type === 'action.result' &&
        message.id === requestId &&
        message.sessionId === sessionId
    })

    await this.transport.send({
      v: PROTOCOL_VERSION,
      id: requestId,
      sessionId,
      type: 'action.invoke',
      payload: {
        driver: driverId,
        name,
        args
      }
    })

    return unwrapDriverResult((await result).payload, 'DRIVER_ACTION_FAILED')
  }

  subscribeSession(sessionId: string, listener: () => void): () => void {
    const state = this.ensureSessionState(sessionId)
    state.listeners.add(listener)
    return () => {
      state.listeners.delete(listener)
    }
  }

  getTerminalError(sessionId: string): Error | null {
    const state = this.sessions.get(sessionId)

    if (!state) {
      return null
    }

    if (state.connectionError) {
      return state.connectionError
    }

    if (state.exit) {
      return new SessionClosedError(sessionId)
    }

    if (this.closeError) {
      return this.closeError
    }

    return null
  }

  getDefaultTimeout(): number {
    return this.defaultTimeout
  }

  async ensureFreshState(sessionId: string): Promise<ScreenSnapshot> {
    const state = this.ensureSessionState(sessionId)

    if (state.refreshPromise) {
      return state.refreshPromise
    }

    state.refreshPromise = this.refreshSession(sessionId).finally(() => {
      state.refreshPromise = null
    })

    return state.refreshPromise
  }

  private ensureSession(sessionId: string): Session {
    const state = this.ensureSessionState(sessionId)

    if (!state.session) {
      state.session = new SdkSession(this, sessionId)
    }

    return state.session
  }

  private ensureSessionState(sessionId: string): SessionState {
    let state = this.sessions.get(sessionId)

    if (!state) {
      state = {
        id: sessionId,
        snapshot: null,
        semantic: null,
        exit: null,
        connectionError: null,
        listeners: new Set(),
        session: null,
        refreshPromise: null
      }
      this.sessions.set(sessionId, state)
    }

    return state
  }

  private handleMessage(message: HostToClientMessage): void {
    switch (message.type) {
      case 'screen.snapshot':
        this.handleSnapshot(message)
        break
      case 'screen.patch':
        this.handlePatch(message)
        break
      case 'event.semantic':
        this.handleSemantic(message)
        break
      case 'session.exited':
        this.handleExit(message)
        break
      default:
        break
    }

    this.dispatchWaiters(message)

    for (const listener of this.rawListeners) {
      try {
        listener(message)
      } catch {
        // User raw listeners should not break the SDK client.
      }
    }
  }

  private handleSnapshot(message: ScreenSnapshotMessage): void {
    if (!message.sessionId) {
      return
    }

    const state = this.ensureSessionState(message.sessionId)
    state.snapshot = cloneScreenSnapshot(message.payload)
    this.notifySessionListeners(state)
  }

  private handlePatch(message: ScreenPatchMessage): void {
    if (!message.sessionId) {
      return
    }

    const state = this.ensureSessionState(message.sessionId)

    if (!state.snapshot) {
      void this.ensureFreshState(message.sessionId).catch(() => undefined)
      return
    }

    const next = applyScreenPatch(state.snapshot, message.payload)

    if (!next) {
      void this.ensureFreshState(message.sessionId).catch(() => undefined)
      return
    }

    state.snapshot = next
    this.notifySessionListeners(state)
  }

  private handleSemantic(message: SemanticEventMessage): void {
    if (!message.sessionId) {
      return
    }

    const state = this.ensureSessionState(message.sessionId)
    state.semantic = toDriverState(message.payload)
    this.notifySessionListeners(state)
  }

  private handleExit(message: SessionExited): void {
    if (!message.sessionId) {
      return
    }

    const state = this.ensureSessionState(message.sessionId)
    state.exit = { ...message.payload }
    this.notifySessionListeners(state)
  }

  private dispatchWaiters(message: HostToClientMessage): void {
    if (message.type === 'error' && message.id) {
      const error = protocolErrorFromMessage(message)

      for (const waiter of [...this.waiters]) {
        if (waiter.requestId === message.id) {
          this.waiters.delete(waiter)
          waiter.cleanup()
          waiter.reject(error)
        }
      }
    }

    for (const waiter of [...this.waiters]) {
      if (waiter.predicate(message)) {
        this.waiters.delete(waiter)
        waiter.cleanup()
        waiter.resolve(message)
      }
    }
  }

  private waitForMessage<TMessage extends HostToClientMessage>(options: {
    requestId?: string
    predicate: (message: HostToClientMessage) => message is TMessage
    timeout?: number
    signal?: AbortSignal
    description: string
  }): Promise<TMessage> {
    const timeoutMs = options.timeout ?? this.defaultTimeout
    const signal = options.signal

    if (signal?.aborted) {
      return Promise.reject(abortError(signal))
    }

    return new Promise<TMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup()
        reject(
          new TimeoutError(
            timeoutMs,
            `Timed out after ${timeoutMs}ms waiting for ${options.description}`
          )
        )
      }, timeoutMs)

      const onAbort = () => {
        cleanup()
        reject(abortError(signal))
      }

      const cleanup = () => {
        clearTimeout(timeout)

        if (signal) {
          signal.removeEventListener('abort', onAbort)
        }
      }

      const waiter: MessageWaiter = {
        requestId: options.requestId,
        predicate: options.predicate,
        resolve: (message) => {
          resolve(message as TMessage)
        },
        reject,
        cleanup
      }

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true })
      }

      if (this.closeError) {
        cleanup()
        reject(this.closeError)
        return
      }

      this.waiters.add(waiter)
    })
  }

  private handleTransportClose(error?: Error): void {
    if (this.closed) {
      return
    }

    this.closed = true
    this.closeError = error ?? new ConnectionClosedError('Transport closed')
    this.unsubscribeMessage()
    this.unsubscribeClose()

    for (const waiter of [...this.waiters]) {
      this.waiters.delete(waiter)
      waiter.cleanup()
      waiter.reject(this.closeError)
    }

    for (const state of this.sessions.values()) {
      state.connectionError = this.closeError
      this.notifySessionListeners(state)
    }
  }

  private notifySessionListeners(state: SessionState): void {
    for (const listener of state.listeners) {
      listener()
    }
  }

  private assertOpen(): void {
    if (this.closeError) {
      throw this.closeError
    }
  }

  private requireRunnableSession(sessionId: string): SessionState {
    this.assertOpen()

    const state = this.ensureSessionState(sessionId)

    if (state.exit) {
      throw new SessionClosedError(sessionId)
    }

    return state
  }
}

function abortError(signal: AbortSignal | undefined): AbortError {
  if (signal?.reason instanceof Error) {
    return new AbortError(signal.reason.message)
  }

  if (typeof signal?.reason === 'string') {
    return new AbortError(signal.reason)
  }

  return new AbortError()
}

function toSessionStartPayload(
  options: SessionLaunchOptions
): Extract<ClientToHostMessage, { type: 'session.start' }>['payload'] {
  return {
    profile: options.profile,
    profileArgs: options.profileArgs,
    command: options.command,
    args: options.args ?? [],
    cwd: options.cwd,
    env: options.env,
    rows: options.rows,
    cols: options.cols,
    driver: options.driver
  }
}

function toDriverState(payload: SemanticEvent['payload']): DriverStateSnapshot {
  return {
    driverId: payload.driverId,
    confidence: payload.confidence,
    revision: payload.revision,
    state: payload.state,
    elements: payload.elements.map((element) => ({
      ...element,
      box: element.box ? { ...element.box } : undefined,
      actions: [...element.actions]
    }))
  }
}

function cloneDriverState(state: DriverStateSnapshot): DriverStateSnapshot {
  return {
    driverId: state.driverId,
    confidence: state.confidence,
    revision: state.revision,
    state: state.state,
    elements: state.elements.map((element) => ({
      ...element,
      box: element.box ? { ...element.box } : undefined,
      actions: [...element.actions]
    }))
  }
}

class SdkSession implements Session {
  readonly id: string
  readonly screen: Screen
  readonly keyboard: Keyboard
  readonly mouse: Mouse

  private readonly client: SdkClient

  constructor(client: SdkClient, sessionId: string) {
    this.client = client
    this.id = sessionId
    this.screen = new SdkScreen({
      getSnapshot: () => this.client.getSnapshot(this.id),
      refresh: async (options) => this.client.refreshSession(this.id, options),
      subscribe: (listener) => this.client.subscribeSession(this.id, listener),
      getDefaultTimeout: () => this.client.getDefaultTimeout(),
      getTerminalError: () => this.client.getTerminalError(this.id)
    })
    this.keyboard = new SdkKeyboard({
      type: async (text) => this.client.inputText(this.id, text),
      paste: async (text) => this.client.inputPaste(this.id, text),
      press: async (key) => this.client.inputKey(this.id, key)
    })
    this.mouse = new SdkMouse()
  }

  locator(query: TextQuery): Locator {
    return this.screen.locator(query)
  }

  driver(driverId?: string): DriverClient {
    return new SdkDriverClient(driverId, {
      getCurrent: () => this.client.getDriverState(this.id),
      subscribe: (listener) => this.client.subscribeSession(this.id, listener),
      getDefaultTimeout: () => this.client.getDefaultTimeout(),
      getTerminalError: () => this.client.getTerminalError(this.id),
      query: (resolvedDriverId, name, args) =>
        this.client.queryDriver(this.id, resolvedDriverId, name, args),
      invoke: (resolvedDriverId, name, args) =>
        this.client.invokeDriver(this.id, resolvedDriverId, name, args)
    })
  }

  async waitForText(
    query: TextQuery,
    options: WaitOptions & { state?: 'visible' | 'hidden' } = {}
  ): Promise<void> {
    await this.locator(query).waitFor(options)
  }

  async stop(): Promise<void> {
    await this.client.stopSession(this.id)
  }

  async waitForExit(
    options?: WaitOptions
  ): Promise<{ exitCode: number | null; signal: string | null }> {
    return this.client.waitForExit(this.id, options)
  }
}
