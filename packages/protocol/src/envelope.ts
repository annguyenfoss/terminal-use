import { z } from './zod.js'

export const PROTOCOL_VERSION = 1 as const

export const requestIdSchema = z.string().min(1)
export const sessionIdSchema = z.string().min(1)

export const envelopeMetaSchema = z
  .object({
    v: z.literal(PROTOCOL_VERSION),
    id: requestIdSchema.optional(),
    sessionId: sessionIdSchema.optional()
  })
  .strict()

export type Envelope<TType extends string, TPayload> = {
  v: typeof PROTOCOL_VERSION
  id?: string
  sessionId?: string
  type: TType
  payload: TPayload
}

export const defineEnvelopeSchema = <
  TType extends string,
  TPayloadSchema extends z.ZodTypeAny
>(
  type: TType,
  payload: TPayloadSchema
) =>
  envelopeMetaSchema.extend({
    type: z.literal(type),
    payload
  })

export type InferEnvelope<TSchema extends z.ZodTypeAny> = z.infer<TSchema>
