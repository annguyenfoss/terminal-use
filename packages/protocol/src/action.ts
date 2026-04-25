import { defineEnvelopeSchema } from './envelope.js'
import { z } from './zod.js'

export const actionInvokePayloadSchema = z
  .object({
    driver: z.string().min(1),
    name: z.string().min(1),
    args: z.unknown().optional()
  })
  .strict()

export const actionInvokeSchema = defineEnvelopeSchema(
  'action.invoke',
  actionInvokePayloadSchema
)

export const actionResultPayloadSchema = z
  .object({
    ok: z.boolean(),
    value: z.unknown().optional(),
    error: z.unknown().optional()
  })
  .strict()

export const actionResultSchema = defineEnvelopeSchema(
  'action.result',
  actionResultPayloadSchema
)

export type ActionInvoke = z.infer<typeof actionInvokeSchema>
export type ActionResult = z.infer<typeof actionResultSchema>
