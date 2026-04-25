import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import type {
  RawEventPayload,
  RecordingFiles,
  SemanticEventPayload,
  ScreenSnapshot
} from '@project-gateway/protocol'

export const RECORDER_PACKAGE_NAME = '@project-gateway/recorder'
export const ASCIICAST_BUNDLE_FORMAT = 'asciicast-bundle' as const

export interface AsciicastBundleMetadata {
  recordingId: string
  sessionId: string
  command: string
  profile?: string
  launchDriverId?: string
  detectedDriverId?: string | null
  outputDir: string
  captureInput: boolean
  format: typeof ASCIICAST_BUNDLE_FORMAT
  initialCols: number
  initialRows: number
  startedAt: number
  stoppedAt?: number
  durationMs?: number
}

export interface AsciicastBundleRecorderOptions {
  sessionId: string
  command: string
  cols: number
  rows: number
  outputDir?: string
  label?: string
  captureInput?: boolean
  profile?: string
  launchDriverId?: string
  detectedDriverId?: string | null
  tempRoot?: string
}

export interface AsciicastBundleStartResult {
  recordingId: string
  outputDir: string
  format: typeof ASCIICAST_BUNDLE_FORMAT
  captureInput: boolean
  files: RecordingFiles
}

export interface AsciicastBundleStopResult extends AsciicastBundleStartResult {
  durationMs: number
}

export class AsciicastBundleRecorder {
  readonly recordingId: string
  readonly outputDir: string
  readonly captureInput: boolean
  readonly files: RecordingFiles

  private readonly startedAt: number
  private readonly meta: AsciicastBundleMetadata
  private stopped = false

  private constructor(
    recordingId: string,
    outputDir: string,
    captureInput: boolean,
    startedAt: number,
    meta: AsciicastBundleMetadata
  ) {
    this.recordingId = recordingId
    this.outputDir = outputDir
    this.captureInput = captureInput
    this.startedAt = startedAt
    this.meta = meta
    this.files = {
      terminalCast: join(outputDir, 'terminal.cast'),
      semanticEvents: join(outputDir, 'semantic.ndjson'),
      snapshots: join(outputDir, 'snapshots.ndjson'),
      meta: join(outputDir, 'meta.json')
    }
  }

  static async create(
    options: AsciicastBundleRecorderOptions
  ): Promise<AsciicastBundleRecorder> {
    const startedAt = Date.now()
    const recordingId = randomUUID()
    const outputDir = await resolveOutputDir(
      options.outputDir,
      options.tempRoot,
      recordingId
    )
    const meta: AsciicastBundleMetadata = {
      recordingId,
      sessionId: options.sessionId,
      command: options.command,
      profile: options.profile,
      launchDriverId: options.launchDriverId,
      detectedDriverId: options.detectedDriverId ?? options.launchDriverId ?? null,
      outputDir,
      captureInput: options.captureInput ?? false,
      format: ASCIICAST_BUNDLE_FORMAT,
      initialCols: options.cols,
      initialRows: options.rows,
      startedAt
    }
    const recorder = new AsciicastBundleRecorder(
      recordingId,
      outputDir,
      meta.captureInput,
      startedAt,
      meta
    )

    await writeFile(
      recorder.files.terminalCast,
      JSON.stringify({
        version: 2,
        width: options.cols,
        height: options.rows,
        timestamp: Math.floor(startedAt / 1000),
        command: options.command,
        title: options.label
      }) + '\n',
      'utf8'
    )
    await writeFile(recorder.files.semanticEvents, '', 'utf8')
    await writeFile(recorder.files.snapshots, '', 'utf8')
    await recorder.writeMeta()

    return recorder
  }

  startResult(): AsciicastBundleStartResult {
    return {
      recordingId: this.recordingId,
      outputDir: this.outputDir,
      format: ASCIICAST_BUNDLE_FORMAT,
      captureInput: this.captureInput,
      files: this.files
    }
  }

  async recordRaw(event: RawEventPayload): Promise<void> {
    this.assertRunning()

    if (event.kind === 'pty-output') {
      await this.appendCast([this.toSeconds(event.at), 'o', event.data])
      return
    }

    if (event.kind === 'input') {
      if (!this.captureInput) {
        return
      }

      await this.appendCast([this.toSeconds(event.at), 'i', event.data])
      return
    }

    if (event.kind === 'resize') {
      await this.appendCast([
        this.toSeconds(event.at),
        'r',
        `${event.cols}x${event.rows}`
      ])
    }
  }

  async recordSemantic(event: SemanticEventPayload): Promise<void> {
    this.assertRunning()
    this.meta.detectedDriverId = event.driverId
    await appendFile(
      this.files.semanticEvents,
      JSON.stringify(event) + '\n',
      'utf8'
    )
    await this.writeMeta()
  }

  async recordSnapshot(snapshot: ScreenSnapshot, at = Date.now()): Promise<void> {
    this.assertRunning()
    await appendFile(
      this.files.snapshots,
      JSON.stringify({
        at,
        snapshot
      }) + '\n',
      'utf8'
    )
  }

  async stop(): Promise<AsciicastBundleStopResult> {
    this.assertRunning()
    this.stopped = true

    const stoppedAt = Date.now()
    const durationMs = stoppedAt - this.startedAt
    this.meta.stoppedAt = stoppedAt
    this.meta.durationMs = durationMs
    await this.writeMeta()

    return {
      ...this.startResult(),
      durationMs
    }
  }

  private async appendCast(event: [number, string, string]): Promise<void> {
    await appendFile(this.files.terminalCast, JSON.stringify(event) + '\n', 'utf8')
  }

  private async writeMeta(): Promise<void> {
    await writeFile(this.files.meta, JSON.stringify(this.meta, null, 2), 'utf8')
  }

  private toSeconds(at: number): number {
    return Math.max(0, (at - this.startedAt) / 1000)
  }

  private assertRunning(): void {
    if (this.stopped) {
      throw new Error(`Recording already stopped: ${this.recordingId}`)
    }
  }
}

async function resolveOutputDir(
  outputDir: string | undefined,
  tempRoot: string | undefined,
  recordingId: string
): Promise<string> {
  if (outputDir) {
    const resolved = resolve(outputDir)
    await mkdir(resolved, { recursive: true })
    return resolved
  }

  const baseRoot = tempRoot ? resolve(tempRoot) : tmpdir()
  await mkdir(baseRoot, { recursive: true })

  return mkdtemp(join(baseRoot, `project-gateway-recording-${recordingId}-`))
}
