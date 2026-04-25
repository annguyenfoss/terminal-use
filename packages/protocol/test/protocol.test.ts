import { describe, expect, it } from 'vitest'

import {
  PROTOCOL_VERSION,
  recordingStartedSchema,
  semanticEventSchema,
  helloOkSchema,
  sessionStartSchema
} from '../src/index.js'

describe('protocol', () => {
  it('parses a hello.ok envelope', () => {
    const message = helloOkSchema.parse({
      v: PROTOCOL_VERSION,
      type: 'hello.ok',
      payload: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {}
      }
    })

    expect(message.payload.protocolVersion).toBe(PROTOCOL_VERSION)
  })

  it('parses a session.start envelope', () => {
    const message = sessionStartSchema.parse({
      v: PROTOCOL_VERSION,
      id: 'req_1',
      type: 'session.start',
      payload: {
        command: 'bash',
        args: ['-lc', 'echo hello'],
        rows: 24,
        cols: 80
      }
    })

    expect(message.payload.command).toBe('bash')
    expect(message.payload.args).toEqual(['-lc', 'echo hello'])
  })

  it('accepts a default-shell session.start envelope', () => {
    const message = sessionStartSchema.parse({
      v: PROTOCOL_VERSION,
      id: 'req_2',
      type: 'session.start',
      payload: {}
    })

    expect(message.payload.command).toBeUndefined()
    expect(message.payload.args).toEqual([])
  })

  it('accepts a profile-based session.start envelope', () => {
    const message = sessionStartSchema.parse({
      v: PROTOCOL_VERSION,
      id: 'req_3',
      type: 'session.start',
      payload: {
        profile: 'deterministic-demo',
        profileArgs: {
          file: '/tmp/demo.txt'
        }
      }
    })

    expect(message.payload.profile).toBe('deterministic-demo')
    expect(message.payload.profileArgs).toEqual({
      file: '/tmp/demo.txt'
    })
  })

  it('parses semantic and recording host events', () => {
    const semantic = semanticEventSchema.parse({
      v: PROTOCOL_VERSION,
      sessionId: 'sess_1',
      type: 'event.semantic',
      payload: {
        kind: 'state',
        at: Date.now(),
        driverId: 'deterministic-demo',
        revision: 4,
        confidence: 1,
        state: {
          selectedLabel: 'Alpha'
        },
        elements: []
      }
    })
    const recording = recordingStartedSchema.parse({
      v: PROTOCOL_VERSION,
      id: 'req_4',
      sessionId: 'sess_1',
      type: 'recording.started',
      payload: {
        recordingId: 'rec_1',
        outputDir: '/tmp/demo',
        format: 'asciicast-bundle',
        captureInput: false,
        files: {
          terminalCast: '/tmp/demo/terminal.cast',
          semanticEvents: '/tmp/demo/semantic.ndjson',
          snapshots: '/tmp/demo/snapshots.ndjson',
          meta: '/tmp/demo/meta.json'
        }
      }
    })

    expect(semantic.payload.driverId).toBe('deterministic-demo')
    expect(recording.payload.format).toBe('asciicast-bundle')
  })
})
