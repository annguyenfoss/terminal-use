import type { ErrorMessage } from '@project-gateway/protocol'

export class GatewayError extends Error {
  constructor(message: string) {
    super(message)
    this.name = new.target.name
  }
}

export class ProtocolError extends GatewayError {
  readonly code: string
  readonly details: unknown
  readonly requestId?: string
  readonly sessionId?: string

  constructor(
    code: string,
    message: string,
    options: {
      details?: unknown
      requestId?: string
      sessionId?: string
    } = {}
  ) {
    super(message)
    this.code = code
    this.details = options.details
    this.requestId = options.requestId
    this.sessionId = options.sessionId
  }
}

export class TimeoutError extends GatewayError {
  readonly timeoutMs: number

  constructor(timeoutMs: number, message = `Timed out after ${timeoutMs}ms`) {
    super(message)
    this.timeoutMs = timeoutMs
  }
}

export class AbortError extends GatewayError {
  constructor(message = 'Operation aborted') {
    super(message)
  }
}

export class ConnectionClosedError extends GatewayError {}

export class SessionClosedError extends GatewayError {
  readonly sessionId: string

  constructor(sessionId: string, message = `Session closed: ${sessionId}`) {
    super(message)
    this.sessionId = sessionId
  }
}

export class UsageError extends GatewayError {}

export function protocolErrorFromMessage(message: ErrorMessage): ProtocolError {
  return new ProtocolError(message.payload.code, message.payload.message, {
    details: message.payload.details,
    requestId: message.id,
    sessionId: message.sessionId
  })
}
