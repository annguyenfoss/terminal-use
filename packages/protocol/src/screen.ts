import { defineEnvelopeSchema } from './envelope.js'
import { z } from './zod.js'

export const revisionSchema = z.number().int().nonnegative()

export const cellSchema = z
  .object({
    ch: z.string(),
    width: z.union([z.literal(1), z.literal(2)]),
    fg: z.string().nullable(),
    bg: z.string().nullable(),
    bold: z.boolean(),
    dim: z.boolean(),
    italic: z.boolean(),
    underline: z.boolean(),
    inverse: z.boolean(),
    blink: z.boolean(),
    invisible: z.boolean(),
    strike: z.boolean()
  })
  .strict()

export const cursorSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    visible: z.boolean(),
    shape: z.enum(['block', 'bar', 'underline', 'unknown'])
  })
  .strict()

export const screenSnapshotPayloadSchema = z
  .object({
    revision: revisionSchema,
    cols: z.number().int().positive(),
    rows: z.number().int().positive(),
    activeBuffer: z.enum(['primary', 'alternate']),
    title: z.string().nullable(),
    cursor: cursorSchema,
    lines: z.array(z.array(cellSchema)),
    plainTextLines: z.array(z.string()),
    scrollbackLines: z.array(z.string())
  })
  .strict()

export const screenPatchRowSchema = z
  .object({
    y: z.number().int().nonnegative(),
    text: z.string(),
    cells: z.array(cellSchema)
  })
  .strict()

export const screenPatchPayloadSchema = z
  .object({
    fromRevision: revisionSchema,
    toRevision: revisionSchema,
    rows: z.array(screenPatchRowSchema),
    cursor: cursorSchema.optional(),
    title: z.string().nullable().optional(),
    activeBuffer: z.enum(['primary', 'alternate']).optional()
  })
  .strict()

export const screenGetPayloadSchema = z.object({}).strict()

export const screenGetSchema = defineEnvelopeSchema(
  'screen.get',
  screenGetPayloadSchema
)

export const screenSnapshotSchema = defineEnvelopeSchema(
  'screen.snapshot',
  screenSnapshotPayloadSchema
)

export const screenPatchSchema = defineEnvelopeSchema(
  'screen.patch',
  screenPatchPayloadSchema
)

export type Cell = z.infer<typeof cellSchema>
export type Cursor = z.infer<typeof cursorSchema>
export type ScreenSnapshot = z.infer<typeof screenSnapshotPayloadSchema>
export type ScreenPatch = z.infer<typeof screenPatchPayloadSchema>
