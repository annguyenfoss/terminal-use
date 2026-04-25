import { defineEnvelopeSchema } from './envelope.js'
import { revisionSchema } from './screen.js'
import { z } from './zod.js'

export const elementBoxSchema = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().nonnegative(),
    h: z.number().int().nonnegative()
  })
  .strict()

export const elementSchema = z
  .object({
    id: z.string().min(1),
    role: z.string().min(1),
    name: z.string().min(1).optional(),
    text: z.string().optional(),
    origin: z.enum(['driver', 'heuristic']),
    confidence: z.number().min(0).max(1),
    box: elementBoxSchema.optional(),
    actions: z.array(z.string().min(1))
  })
  .strict()

const rawEventAtSchema = z.number().nonnegative()

export const rawPtyOutputEventSchema = z
  .object({
    kind: z.literal('pty-output'),
    at: rawEventAtSchema,
    data: z.string()
  })
  .strict()

export const rawInputEventSchema = z
  .object({
    kind: z.literal('input'),
    at: rawEventAtSchema,
    inputType: z.enum(['key', 'text', 'paste']),
    data: z.string(),
    key: z.string().min(1).optional()
  })
  .strict()

export const rawResizeEventSchema = z
  .object({
    kind: z.literal('resize'),
    at: rawEventAtSchema,
    cols: z.number().int().positive(),
    rows: z.number().int().positive()
  })
  .strict()

export const rawSnapshotEventSchema = z
  .object({
    kind: z.literal('snapshot'),
    at: rawEventAtSchema,
    revision: revisionSchema
  })
  .strict()

export const rawSessionExitEventSchema = z
  .object({
    kind: z.literal('session-exit'),
    at: rawEventAtSchema,
    exitCode: z.number().int().nullable(),
    signal: z.string().min(1).nullable()
  })
  .strict()

export const rawEventPayloadSchema = z.discriminatedUnion('kind', [
  rawPtyOutputEventSchema,
  rawInputEventSchema,
  rawResizeEventSchema,
  rawSnapshotEventSchema,
  rawSessionExitEventSchema
])

export const rawEventSchema = defineEnvelopeSchema('event.raw', rawEventPayloadSchema)

export const semanticEventPayloadSchema = z
  .object({
    kind: z.literal('state'),
    at: rawEventAtSchema,
    driverId: z.string().min(1).nullable(),
    revision: revisionSchema,
    confidence: z.number().min(0).max(1),
    state: z.unknown().nullable(),
    elements: z.array(elementSchema)
  })
  .strict()

export const semanticEventSchema = defineEnvelopeSchema('event.semantic', semanticEventPayloadSchema)

export type ElementBox = z.infer<typeof elementBoxSchema>
export type Element = z.infer<typeof elementSchema>
export type RawEventPayload = z.infer<typeof rawEventPayloadSchema>
export type RawEvent = z.infer<typeof rawEventSchema>
export type SemanticEventPayload = z.infer<typeof semanticEventPayloadSchema>
export type SemanticEvent = z.infer<typeof semanticEventSchema>
