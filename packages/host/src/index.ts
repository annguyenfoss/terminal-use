export { PROTOCOL_VERSION } from '@terminal-use/protocol'
export { HostServer, createHostServer } from './server.js'
export type {
  HostServerOptions,
  HostSessionStartResult,
  ManagedLaunchProfileDefinition,
  ManagedLaunchProfile,
  ManagedLaunchProfileResolver,
  ManagedLaunchProfileResolverContext,
  ManagedShellLaunchOptions,
  WsServerOptions
} from './server.js'
export { InProcessConnection } from './transports/in-process.js'
export { HostWebSocketServer } from './transports/ws-server.js'
export type { ManagedLauncherConfig } from './launchers/nano.js'

export const HOST_PACKAGE_NAME = '@terminal-use/host'
