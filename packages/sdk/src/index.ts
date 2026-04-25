export {
  AbortError,
  ConnectionClosedError,
  GatewayError,
  ProtocolError,
  SessionClosedError,
  TimeoutError,
  UsageError
} from './errors.js'
export type { DriverClient } from './driver-client.js'
export type { ElementHandle } from './element-handle.js'
export { SUPPORTED_KEYS } from './keyboard.js'
export type { Keyboard, SupportedKey } from './keyboard.js'
export type {
  Locator,
  LocatorWaitOptions,
  TextMatchHandle,
  TextQuery
} from './locator.js'
export type { Mouse } from './mouse.js'
export type { GatewayClient, Session, SessionLaunchOptions } from './session.js'
export type { Screen } from './screen.js'
export {
  connectWebSocket,
  createInProcessClient,
  type ClientOptions
} from './transport.js'
export type { WaitOptions } from './wait.js'
export { DEFAULT_TIMEOUT_MS } from './wait.js'

export { PROTOCOL_VERSION } from '@terminal-use/protocol'

export const SDK_PACKAGE_NAME = '@terminal-use/sdk'
