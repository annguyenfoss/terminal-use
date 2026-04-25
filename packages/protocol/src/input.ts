import { defineEnvelopeSchema } from './envelope.js'
import { z } from './zod.js'

export const inputKeyPayloadSchema = z
  .object({
    key: z.string().min(1)
  })
  .strict()

export const inputKeySchema = defineEnvelopeSchema(
  'input.key',
  inputKeyPayloadSchema
)

export const inputTextPayloadSchema = z
  .object({
    text: z.string()
  })
  .strict()

export const inputTextSchema = defineEnvelopeSchema(
  'input.text',
  inputTextPayloadSchema
)

export const inputPastePayloadSchema = z
  .object({
    text: z.string()
  })
  .strict()

export const inputPasteSchema = defineEnvelopeSchema(
  'input.paste',
  inputPastePayloadSchema
)

export type InputKey = z.infer<typeof inputKeySchema>
export type InputText = z.infer<typeof inputTextSchema>
export type InputPaste = z.infer<typeof inputPasteSchema>
