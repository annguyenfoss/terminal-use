import { describe, expect, it } from 'vitest'

import {
  DETERMINISTIC_DEMO_DRIVER_ID,
  createDeterministicDemoHostConfig
} from '../../testing/src/index.js'
import { createHostServer } from '../../host/src/index.js'
import { createInProcessClient } from '../src/index.js'

describe('SDK driver client', () => {
  it('waits for semantic state and invokes demo driver actions', async () => {
    const host = createHostServer(createDeterministicDemoHostConfig())
    const client = await createInProcessClient(host)

    try {
      const session = await client.startSession({
        profile: 'deterministic-demo'
      })
      const driver = session.driver(DETERMINISTIC_DEMO_DRIVER_ID)

      const firstState = await driver.waitForState(
        (state) =>
          state.driverId === DETERMINISTIC_DEMO_DRIVER_ID &&
          (state.state as { selectedLabel?: string } | null)?.selectedLabel === 'Alpha'
      )
      expect(firstState.driverId).toBe(DETERMINISTIC_DEMO_DRIVER_ID)

      const queried = await driver.query('state')
      expect(
        (queried as { state: { selectedLabel: string } }).state.selectedLabel
      ).toBe('Alpha')

      await driver.invoke('moveNext')

      const nextState = await driver.waitForState(
        (state) =>
          (state.state as { selectedLabel?: string } | null)?.selectedLabel === 'Beta'
      )
      expect(
        (nextState.state as { selectedLabel?: string } | null)?.selectedLabel
      ).toBe('Beta')

      await session.stop()
      await session.waitForExit()
    } finally {
      await client.close()
      await host.close()
    }
  })
})
