import { defineEnvelopeSchema, sessionIdSchema } from './envelope.js'
import { z } from './zod.js'

export const sessionStartPayloadSchema = z
  .object({
    profile: z.string().min(1).optional(),
    profileArgs: z.unknown().optional(),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).default([]),
    cwd: z.string().min(1).optional(),
    env: z.record(z.string()).optional(),
    rows: z.number().int().positive().optional(),
    cols: z.number().int().positive().optional(),
    driver: z.string().min(1).optional()
  })
  .strict()

export const sessionStartSchema = defineEnvelopeSchema(
  'session.start',
  sessionStartPayloadSchema
)

export const sessionAttachPayloadSchema = z
  .object({
    sessionId: sessionIdSchema
  })
  .strict()

export const sessionAttachSchema = defineEnvelopeSchema(
  'session.attach',
  sessionAttachPayloadSchema
)

export const sessionStopPayloadSchema = z.object({}).strict()

export const sessionStopSchema = defineEnvelopeSchema(
  'session.stop',
  sessionStopPayloadSchema
)

export const sessionResizePayloadSchema = z
  .object({
    cols: z.number().int().positive(),
    rows: z.number().int().positive()
  })
  .strict()

export const sessionResizeSchema = defineEnvelopeSchema(
  'session.resize',
  sessionResizePayloadSchema
)

export const sessionStartedPayloadSchema = z
  .object({
    sessionId: sessionIdSchema,
    profile: z.string().min(1).optional(),
    command: z.string().min(1),
    args: z.array(z.string()),
    cols: z.number().int().positive(),
    rows: z.number().int().positive(),
    driver: z.string().min(1).optional()
  })
  .strict()

export const sessionStartedSchema = defineEnvelopeSchema(
  'session.started',
  sessionStartedPayloadSchema
)

export const sessionExitedPayloadSchema = z
  .object({
    exitCode: z.number().int().nullable(),
    signal: z.string().min(1).nullable()
  })
  .strict()

export const sessionExitedSchema = defineEnvelopeSchema(
  'session.exited',
  sessionExitedPayloadSchema
)

export type SessionStart = z.infer<typeof sessionStartSchema>
export type SessionAttach = z.infer<typeof sessionAttachSchema>
export type SessionStop = z.infer<typeof sessionStopSchema>
export type SessionResize = z.infer<typeof sessionResizeSchema>
export type SessionStarted = z.infer<typeof sessionStartedSchema>
export type SessionExited = z.infer<typeof sessionExitedSchema>
