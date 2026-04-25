import type {
  RecordingStart,
  RecordingStarted,
  RecordingStopped,
  RawEventPayload,
  ScreenSnapshot,
  SemanticEventPayload
} from '@terminal-use/protocol'
import { PROTOCOL_VERSION } from '@terminal-use/protocol'
import {
  AsciicastBundleRecorder,
  type AsciicastBundleRecorderOptions
} from '@terminal-use/recorder'

import type { SessionRecord } from './session-registry.js'

interface ActiveRecording {
  recorder: AsciicastBundleRecorder
}

export interface RecordingStoreOptions {
  tempRoot?: string
}

export class RecordingStore {
  private readonly active = new Map<string, ActiveRecording>()
  private readonly options: RecordingStoreOptions

  constructor(options: RecordingStoreOptions = {}) {
    this.options = options
  }

  get(sessionId: string): ActiveRecording | null {
    return this.active.get(sessionId) ?? null
  }

  async start(options: {
    session: SessionRecord
    request: RecordingStart
    snapshot: ScreenSnapshot
    semanticEvent?: SemanticEventPayload | null
  }): Promise<RecordingStarted> {
    if (this.active.has(options.session.id)) {
      throw new Error(`Recording already active for session: ${options.session.id}`)
    }

    const recorder = await AsciicastBundleRecorder.create(
      toRecorderOptions(options.session, options.request.payload, this.options.tempRoot)
    )

    await recorder.recordSnapshot(options.snapshot, Date.now())

    if (options.semanticEvent) {
      await recorder.recordSemantic(options.semanticEvent)
    }

    this.active.set(options.session.id, {
      recorder
    })

    return {
      v: PROTOCOL_VERSION,
      id: options.request.id,
      sessionId: options.session.id,
      type: 'recording.started',
      payload: recorder.startResult()
    }
  }

  async stop(
    session: SessionRecord,
    request?: { id?: string }
  ): Promise<RecordingStopped> {
    const active = this.active.get(session.id)

    if (!active) {
      throw new Error(`Recording is not active for session: ${session.id}`)
    }

    this.active.delete(session.id)
    const result = await active.recorder.stop()

    return {
      v: PROTOCOL_VERSION,
      id: request?.id,
      sessionId: session.id,
      type: 'recording.stopped',
      payload: result
    }
  }

  async recordRaw(sessionId: string, event: RawEventPayload): Promise<void> {
    const active = this.active.get(sessionId)

    if (!active) {
      return
    }

    await active.recorder.recordRaw(event)
  }

  async recordSemantic(
    sessionId: string,
    event: SemanticEventPayload
  ): Promise<void> {
    const active = this.active.get(sessionId)

    if (!active) {
      return
    }

    await active.recorder.recordSemantic(event)
  }

  async recordSnapshot(
    sessionId: string,
    snapshot: ScreenSnapshot,
    at = Date.now()
  ): Promise<void> {
    const active = this.active.get(sessionId)

    if (!active) {
      return
    }

    await active.recorder.recordSnapshot(snapshot, at)
  }
}

function toRecorderOptions(
  session: SessionRecord,
  payload: RecordingStart['payload'],
  tempRoot?: string
): AsciicastBundleRecorderOptions {
  return {
    sessionId: session.id,
    command: session.command,
    cols: session.terminalState.snapshot.cols,
    rows: session.terminalState.snapshot.rows,
    outputDir: payload.outputDir,
    label: payload.label,
    captureInput: payload.captureInput,
    profile: session.profile,
    launchDriverId: session.driver,
    tempRoot
  }
}
