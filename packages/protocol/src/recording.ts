import { defineEnvelopeSchema } from './envelope.js'
import { z } from './zod.js'

export const recordingFormatSchema = z.literal('asciicast-bundle')

export const recordingStartPayloadSchema = z
  .object({
    label: z.string().min(1).optional(),
    outputDir: z.string().min(1).optional(),
    format: recordingFormatSchema.default('asciicast-bundle'),
    captureInput: z.boolean().default(false)
  })
  .strict()

export const recordingStartSchema = defineEnvelopeSchema(
  'recording.start',
  recordingStartPayloadSchema
)

export const recordingStopPayloadSchema = z.object({}).strict()

export const recordingStopSchema = defineEnvelopeSchema(
  'recording.stop',
  recordingStopPayloadSchema
)

export const recordingFilesSchema = z
  .object({
    terminalCast: z.string().min(1),
    semanticEvents: z.string().min(1),
    snapshots: z.string().min(1),
    meta: z.string().min(1)
  })
  .strict()

export const recordingStartedPayloadSchema = z
  .object({
    recordingId: z.string().min(1),
    outputDir: z.string().min(1),
    format: recordingFormatSchema,
    captureInput: z.boolean(),
    files: recordingFilesSchema
  })
  .strict()

export const recordingStartedSchema = defineEnvelopeSchema(
  'recording.started',
  recordingStartedPayloadSchema
)

export const recordingStoppedPayloadSchema = z
  .object({
    recordingId: z.string().min(1),
    outputDir: z.string().min(1),
    format: recordingFormatSchema,
    captureInput: z.boolean(),
    durationMs: z.number().nonnegative(),
    files: recordingFilesSchema
  })
  .strict()

export const recordingStoppedSchema = defineEnvelopeSchema(
  'recording.stopped',
  recordingStoppedPayloadSchema
)

export type RecordingFiles = z.infer<typeof recordingFilesSchema>
export type RecordingStart = z.infer<typeof recordingStartSchema>
export type RecordingStop = z.infer<typeof recordingStopSchema>
export type RecordingStarted = z.infer<typeof recordingStartedSchema>
export type RecordingStopped = z.infer<typeof recordingStoppedSchema>
