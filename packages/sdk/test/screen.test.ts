import { describe, expect, it } from 'vitest'

import { applyScreenPatch } from '../src/screen.js'
import { createSnapshot } from './helpers.js'

describe('screen cache', () => {
  it('applies visible-row patches and metadata updates', () => {
    const snapshot = createSnapshot(['alpha', 'beta'])
    const next = applyScreenPatch(snapshot, {
      fromRevision: 1,
      toRevision: 2,
      rows: [
        {
          y: 1,
          text: 'done',
          cells: createSnapshot(['done']).lines[0]
        }
      ],
      cursor: {
        x: 4,
        y: 1,
        visible: true,
        shape: 'bar'
      },
      title: 'shell',
      activeBuffer: 'alternate'
    })

    expect(next).not.toBeNull()
    expect(next?.revision).toBe(2)
    expect(next?.plainTextLines[1]).toBe('done')
    expect(next?.cursor.shape).toBe('bar')
    expect(next?.title).toBe('shell')
    expect(next?.activeBuffer).toBe('alternate')
  })

  it('rejects patches with mismatched revisions', () => {
    const snapshot = createSnapshot(['alpha'])

    expect(
      applyScreenPatch(snapshot, {
        fromRevision: 99,
        toRevision: 100,
        rows: []
      })
    ).toBeNull()
  })
})
