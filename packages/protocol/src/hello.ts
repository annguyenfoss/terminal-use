import { capabilitiesSchema } from './capabilities.js'
import { defineEnvelopeSchema, PROTOCOL_VERSION } from './envelope.js'
import { z } from './zod.js'

export const helloPayloadSchema = z
  .object({
    clientName: z.string().min(1).optional()
  })
  .strict()

export const helloSchema = defineEnvelopeSchema('hello', helloPayloadSchema)

export const helloOkPayloadSchema = z
  .object({
    protocolVersion: z.literal(PROTOCOL_VERSION),
    capabilities: capabilitiesSchema
  })
  .strict()

export const helloOkSchema = defineEnvelopeSchema(
  'hello.ok',
  helloOkPayloadSchema
)

export type Hello = z.infer<typeof helloSchema>
export type HelloOk = z.infer<typeof helloOkSchema>
