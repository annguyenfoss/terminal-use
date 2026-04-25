import { setTimeout as delay } from 'node:timers/promises'

import { describe, expect, it } from 'vitest'

import { TimeoutError } from '../src/errors.js'
import { SdkLocator, countTextMatches } from '../src/locator.js'
import { createSnapshot } from './helpers.js'

describe('SdkLocator', () => {
  it('counts string and regex matches across visible lines', () => {
    expect(
      countTextMatches(['alpha beta alpha', 'beta'], 'alpha')
    ).toBe(2)
    expect(
      countTextMatches(['shell prompt', 'prompt ready'], /prompt/g)
    ).toBe(2)
  })

  it('waits for visible text from live cache updates', async () => {
    let snapshot = createSnapshot(['PROMPT> '])
    const listeners = new Set<() => void>()
    const locator = new SdkLocator({
      query: 'done',
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },
      getDefaultTimeout: () => 500,
      getTerminalError: () => null
    })

    const wait = locator.waitFor()

    await delay(10)
    snapshot = createSnapshot(['PROMPT> done'])

    for (const listener of listeners) {
      listener()
    }

    await wait
    expect(locator.isVisible()).toBe(true)
  })

  it('times out when text never appears', async () => {
    const locator = new SdkLocator({
      query: 'missing',
      getSnapshot: () => createSnapshot(['PROMPT> ']),
      subscribe: () => () => undefined,
      getDefaultTimeout: () => 25,
      getTerminalError: () => null
    })

    await expect(locator.waitFor()).rejects.toBeInstanceOf(TimeoutError)
  })
})
