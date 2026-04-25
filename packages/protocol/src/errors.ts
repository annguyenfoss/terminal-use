import { defineEnvelopeSchema } from './envelope.js'
import { z } from './zod.js'

export const errorPayloadSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional()
  })
  .strict()

export const errorSchema = defineEnvelopeSchema('error', errorPayloadSchema)

export type ErrorMessage = z.infer<typeof errorSchema>
