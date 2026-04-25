import { defineEnvelopeSchema } from './envelope.js'
import { z } from './zod.js'

export const queryRunPayloadSchema = z
  .object({
    driver: z.string().min(1).optional(),
    name: z.enum(['state', 'locate']),
    args: z.unknown().optional()
  })
  .strict()

export const queryRunSchema = defineEnvelopeSchema(
  'query.run',
  queryRunPayloadSchema
)

export const queryResultPayloadSchema = z
  .object({
    ok: z.boolean(),
    value: z.unknown().optional(),
    error: z.unknown().optional()
  })
  .strict()

export const queryResultSchema = defineEnvelopeSchema(
  'query.result',
  queryResultPayloadSchema
)

export type QueryRun = z.infer<typeof queryRunSchema>
export type QueryResult = z.infer<typeof queryResultSchema>
