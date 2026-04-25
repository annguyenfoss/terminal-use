import { z } from './zod.js'

export { PROTOCOL_VERSION } from './envelope.js'
export type { Envelope } from './envelope.js'
export {
  defineEnvelopeSchema,
  envelopeMetaSchema,
  requestIdSchema,
  sessionIdSchema
} from './envelope.js'
export * from './hello.js'
export * from './session.js'
export * from './input.js'
export * from './screen.js'
export * from './query.js'
export * from './action.js'
export * from './events.js'
export * from './recording.js'
export * from './errors.js'
export * from './capabilities.js'
export * from './zod.js'

import { actionInvokeSchema, actionResultSchema } from './action.js'
import { errorSchema } from './errors.js'
import { rawEventSchema, semanticEventSchema } from './events.js'
import { helloOkSchema, helloSchema } from './hello.js'
import { inputKeySchema, inputPasteSchema, inputTextSchema } from './input.js'
import {
  recordingStartSchema,
  recordingStartedSchema,
  recordingStopSchema,
  recordingStoppedSchema
} from './recording.js'
import { queryResultSchema, queryRunSchema } from './query.js'
import { screenGetSchema, screenPatchSchema, screenSnapshotSchema } from './screen.js'
import {
  sessionAttachSchema,
  sessionExitedSchema,
  sessionResizeSchema,
  sessionStartSchema,
  sessionStartedSchema,
  sessionStopSchema
} from './session.js'

export const clientToHostMessageSchema = z.union([
  helloSchema,
  sessionStartSchema,
  sessionAttachSchema,
  sessionStopSchema,
  sessionResizeSchema,
  inputKeySchema,
  inputTextSchema,
  inputPasteSchema,
  screenGetSchema,
  queryRunSchema,
  actionInvokeSchema,
  recordingStartSchema,
  recordingStopSchema
])

export const hostToClientMessageSchema = z.union([
  helloOkSchema,
  sessionStartedSchema,
  sessionExitedSchema,
  screenSnapshotSchema,
  screenPatchSchema,
  queryResultSchema,
  actionResultSchema,
  rawEventSchema,
  semanticEventSchema,
  recordingStartedSchema,
  recordingStoppedSchema,
  errorSchema
])

export const protocolMessageSchema = z.union([
  clientToHostMessageSchema,
  hostToClientMessageSchema
])

export type ClientToHostMessage = z.infer<typeof clientToHostMessageSchema>
export type HostToClientMessage = z.infer<typeof hostToClientMessageSchema>
export type ProtocolMessage = z.infer<typeof protocolMessageSchema>
