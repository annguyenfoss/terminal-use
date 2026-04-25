import { access, mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'

import { describe, expect, it } from 'vitest'

import { PROTOCOL_VERSION } from '@project-gateway/protocol'

import {
  DETERMINISTIC_DEMO_DRIVER_ID,
  createDeterministicDemoHostConfig
} from '../../testing/src/index.js'
import { createHostServer } from '../src/index.js'
import { attachInbox } from './helpers.js'

describe('Phase 3 host integration', () => {
  it('supports semantic state, driver actions, and recording bundles', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'project-gateway-phase3-'))
    const outputDir = join(tempRoot, 'recording-bundle')
    const host = createHostServer({
      ...createDeterministicDemoHostConfig(),
      tempRoot
    })
    const connection = host.createConnection()
    const inbox = attachInbox(connection)

    try {
      await connection.send({
        v: PROTOCOL_VERSION,
        id: 'start-demo',
        type: 'session.start',
        payload: {
          profile: 'deterministic-demo'
        }
      })

      const started = await inbox.waitFor(
        (message) => message.type === 'session.started' && message.id === 'start-demo'
      )
      expect(started.type).toBe('session.started')
      const sessionId = started.payload.sessionId

      const firstSemantic = await inbox.waitFor(
        (message) =>
          message.type === 'event.semantic' &&
          message.sessionId === sessionId &&
          message.payload.driverId === DETERMINISTIC_DEMO_DRIVER_ID
      )
      expect(firstSemantic.type).toBe('event.semantic')
      expect(firstSemantic.payload.driverId).toBe(DETERMINISTIC_DEMO_DRIVER_ID)

      const initialState = await waitForDriverState(
        connection,
        inbox,
        sessionId,
        'Alpha'
      )
      expect(initialState.state.selectedLabel).toBe('Alpha')

      await connection.send({
        v: PROTOCOL_VERSION,
        id: 'record-start',
        sessionId,
        type: 'recording.start',
        payload: {
          format: 'asciicast-bundle',
          outputDir,
          captureInput: false
        }
      })

      const recordingStarted = await inbox.waitFor(
        (message) =>
          message.type === 'recording.started' && message.id === 'record-start'
      )
      expect(recordingStarted.type).toBe('recording.started')
      await access(recordingStarted.payload.files.terminalCast)

      await connection.send({
        v: PROTOCOL_VERSION,
        id: 'move-next',
        sessionId,
        type: 'action.invoke',
        payload: {
          driver: DETERMINISTIC_DEMO_DRIVER_ID,
          name: 'moveNext'
        }
      })

      const action = await inbox.waitFor(
        (message) => message.type === 'action.result' && message.id === 'move-next'
      )
      expect(action.type).toBe('action.result')
      expect(action.payload.ok).toBe(true)

      const nextState = await waitForDriverState(connection, inbox, sessionId, 'Beta')
      expect(nextState.state.selectedLabel).toBe('Beta')

      await connection.send({
        v: PROTOCOL_VERSION,
        id: 'record-stop',
        sessionId,
        type: 'recording.stop',
        payload: {}
      })

      const recordingStopped = await inbox.waitFor(
        (message) =>
          message.type === 'recording.stopped' && message.id === 'record-stop'
      )
      expect(recordingStopped.type).toBe('recording.stopped')

      const cast = await readFile(recordingStopped.payload.files.terminalCast, 'utf8')
      const semantic = await readFile(
        recordingStopped.payload.files.semanticEvents,
        'utf8'
      )

      expect(cast).toContain('"version":2')
      expect(semantic).toContain(DETERMINISTIC_DEMO_DRIVER_ID)
    } finally {
      await connection.close()
      await host.close()
    }
  }, 15_000)
})

function isSelectedLabel(state: unknown, expected: string): boolean {
  if (!state || typeof state !== 'object') {
    return false
  }

  return (
    'selectedLabel' in state &&
    (state as { selectedLabel?: unknown }).selectedLabel === expected
  )
}

async function waitForDriverState(
  connection: { send: (message: unknown) => Promise<void> },
  inbox: ReturnType<typeof attachInbox>,
  sessionId: string,
  selectedLabel: string,
  timeoutMs = 5_000
): Promise<{ state: { selectedLabel: string } }> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const requestId = `query-${Date.now()}`
    await connection.send({
      v: PROTOCOL_VERSION,
      id: requestId,
      sessionId,
      type: 'query.run',
      payload: {
        driver: DETERMINISTIC_DEMO_DRIVER_ID,
        name: 'state'
      }
    })

    const result = await inbox.waitFor(
      (message) => message.type === 'query.result' && message.id === requestId,
      1000
    )

    if (
      result.type === 'query.result' &&
      result.payload.ok &&
      isSelectedLabel(
        (result.payload.value as { state: unknown }).state,
        selectedLabel
      )
    ) {
      return result.payload.value as { state: { selectedLabel: string } }
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for driver state: ${selectedLabel}`)
}
