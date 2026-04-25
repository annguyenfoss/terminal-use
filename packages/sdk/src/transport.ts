import type { HostServer } from '@project-gateway/host'
import type {
  ClientToHostMessage,
  HostToClientMessage
} from '@project-gateway/protocol'
import { hostToClientMessageSchema } from '@project-gateway/protocol'

import { ConnectionClosedError, ProtocolError } from './errors.js'
import { SdkClient, type GatewayClient } from './session.js'
import { DEFAULT_TIMEOUT_MS, abortErrorFromSignal, resolveTimeoutMs, type WaitOptions } from './wait.js'

type MessageListener = (message: HostToClientMessage) => void
type CloseListener = (error?: Error) => void

export interface ClientOptions extends WaitOptions {
  clientName?: string
}

export interface TransportConnection {
  send(message: ClientToHostMessage): Promise<void>
  onMessage(listener: MessageListener): () => void
  onClose(listener: CloseListener): () => void
  close(): Promise<void>
}

const DEFAULT_CLIENT_NAME = '@project-gateway/sdk'

export async function createInProcessClient(
  host: HostServer,
  options: ClientOptions = {}
): Promise<GatewayClient> {
  const connection = host.createConnection()
  const transport = createInProcessTransport(connection)
  return initializeClient(transport, options)
}

export async function connectWebSocket(
  url: string,
  options: ClientOptions = {}
): Promise<GatewayClient> {
  const transport = await createWebSocketTransport(url, options)
  return initializeClient(transport, options)
}

async function initializeClient(
  transport: TransportConnection,
  options: ClientOptions
): Promise<GatewayClient> {
  const client = new SdkClient(transport, {
    defaultTimeout: resolveTimeoutMs(options.timeout, DEFAULT_TIMEOUT_MS)
  })

  try {
    await client.initialize(options.clientName ?? DEFAULT_CLIENT_NAME, options)
    return client
  } catch (error) {
    await transport.close().catch(() => undefined)
    throw error
  }
}

function createInProcessTransport(connection: {
  send(message: ClientToHostMessage): Promise<void>
  onMessage(listener: MessageListener): () => void
  close(): Promise<void>
}): TransportConnection {
  const listeners = new Set<MessageListener>()
  const closeListeners = new Set<CloseListener>()
  const unsubscribe = connection.onMessage((message) => {
    for (const listener of listeners) {
      listener(message)
    }
  })
  let closed = false

  const notifyClose = (error?: Error) => {
    if (closed) {
      return
    }

    closed = true
    unsubscribe()

    for (const listener of closeListeners) {
      listener(error)
    }
  }

  return {
    async send(message) {
      if (closed) {
        throw new ConnectionClosedError('Transport closed')
      }

      await connection.send(message)
    },
    onMessage(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    onClose(listener) {
      closeListeners.add(listener)
      return () => {
        closeListeners.delete(listener)
      }
    },
    async close() {
      if (closed) {
        return
      }

      await connection.close()
      notifyClose()
    }
  }
}

async function createWebSocketTransport(
  url: string,
  options: ClientOptions
): Promise<TransportConnection> {
  const WebSocketCtor = globalThis.WebSocket

  if (!WebSocketCtor) {
    throw new ConnectionClosedError('WebSocket is unavailable in this runtime')
  }

  const socket = new WebSocketCtor(url)
  const timeoutMs = resolveTimeoutMs(options.timeout, DEFAULT_TIMEOUT_MS)

  await new Promise<void>((resolve, reject) => {
    let settled = false
    let timeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      fail(new ConnectionClosedError(`Timed out after ${timeoutMs}ms opening WebSocket`))
    }, timeoutMs)

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }

      socket.removeEventListener('open', handleOpen)
      socket.removeEventListener('error', handleError)
      socket.removeEventListener('close', handleClose)

      if (options.signal) {
        options.signal.removeEventListener('abort', handleAbort)
      }
    }

    const succeed = () => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      resolve()
    }

    const fail = (error: Error) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      reject(error)
    }

    const handleOpen = () => {
      succeed()
    }

    const handleError = () => {
      fail(new ConnectionClosedError('WebSocket connection failed'))
    }

    const handleClose = () => {
      fail(new ConnectionClosedError('WebSocket closed before it became ready'))
    }

    const handleAbort = () => {
      socket.close(1000, 'aborted')
      fail(abortErrorFromSignal(options.signal!))
    }

    socket.addEventListener('open', handleOpen)
    socket.addEventListener('error', handleError)
    socket.addEventListener('close', handleClose)

    if (options.signal) {
      if (options.signal.aborted) {
        handleAbort()
        return
      }

      options.signal.addEventListener('abort', handleAbort, { once: true })
    }
  })

  const listeners = new Set<MessageListener>()
  const closeListeners = new Set<CloseListener>()
  let closeError: Error | null = null
  let closePromise: Promise<void> | null = null

  const notifyClose = (error?: Error) => {
    if (closeError) {
      return
    }

    closeError = error ?? new ConnectionClosedError('WebSocket closed')

    for (const listener of closeListeners) {
      listener(closeError)
    }
  }

  socket.addEventListener('message', (event) => {
    void handleSocketMessage(event.data)
  })
  socket.addEventListener('close', () => {
    notifyClose()
  })
  socket.addEventListener('error', () => {
    notifyClose(new ConnectionClosedError('WebSocket transport error'))
  })

  async function handleSocketMessage(data: unknown): Promise<void> {
    try {
      const raw = await readSocketData(data)
      const parsed = JSON.parse(raw)
      const message = hostToClientMessageSchema.parse(parsed)

      for (const listener of listeners) {
        listener(message)
      }
    } catch (error) {
      notifyClose(
        error instanceof Error
          ? error
          : new ProtocolError('WS_INVALID_MESSAGE', 'Invalid WebSocket message')
      )
      socket.close(1002, 'invalid message')
    }
  }

  const transport: TransportConnection = {
    async send(message) {
      if (closeError || socket.readyState !== WebSocketCtor.OPEN) {
        throw closeError ?? new ConnectionClosedError('WebSocket is not open')
      }

      socket.send(JSON.stringify(message))
    },
    onMessage(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    onClose(listener) {
      closeListeners.add(listener)

      if (closeError) {
        listener(closeError)
      }

      return () => {
        closeListeners.delete(listener)
      }
    },
    async close() {
      if (socket.readyState === WebSocketCtor.CLOSED) {
        notifyClose()
        return
      }

      if (!closePromise) {
        closePromise = new Promise<void>((resolve) => {
          const unsubscribeClose = transport.onClose(() => {
            unsubscribeClose()
            resolve()
          })
          socket.close(1000, 'client closing')
        })
      }

      await closePromise
    }
  }

  return transport
}

async function readSocketData(data: unknown): Promise<string> {
  if (typeof data === 'string') {
    return data
  }

  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data)
  }

  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    )
  }

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return data.text()
  }

  throw new ProtocolError('WS_INVALID_MESSAGE', 'Unsupported WebSocket message payload')
}
