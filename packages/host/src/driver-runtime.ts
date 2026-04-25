import type {
  ActionResult,
  Driver,
  DriverIO
} from '@terminal-use/driver-kit'
import type { Element, ScreenSnapshot, SemanticEventPayload } from '@terminal-use/protocol'

import type { DriverStateStore } from './driver-state-store.js'

export interface DriverEvaluation {
  driver: Driver | null
  payload: SemanticEventPayload
}

export class DriverRuntime {
  private readonly drivers = new Map<string, Driver>()

  constructor(drivers: Driver[] = []) {
    drivers.forEach((driver) => {
      this.register(driver)
    })
  }

  register(driver: Driver): void {
    this.drivers.set(driver.id, driver)
  }

  get(driverId: string): Driver | null {
    return this.drivers.get(driverId) ?? null
  }

  evaluate(options: {
    snapshot: ScreenSnapshot
    preferredDriverId?: string
    at?: number
  }): DriverEvaluation {
    const at = options.at ?? Date.now()
    const resolved = this.resolveDriver(options.snapshot, options.preferredDriverId)

    if (!resolved) {
      return {
        driver: null,
        payload: {
          kind: 'state',
          at,
          driverId: null,
          revision: options.snapshot.revision,
          confidence: 0,
          state: null,
          elements: []
        }
      }
    }

    try {
      const state = resolved.driver.parse(options.snapshot)
      const elements = sanitizeElements(resolved.driver.locate(state, undefined))

      return {
        driver: resolved.driver,
        payload: {
          kind: 'state',
          at,
          driverId: resolved.driver.id,
          revision: options.snapshot.revision,
          confidence: resolved.confidence,
          state,
          elements
        }
      }
    } catch {
      return {
        driver: resolved.driver,
        payload: {
          kind: 'state',
          at,
          driverId: resolved.driver.id,
          revision: options.snapshot.revision,
          confidence: resolved.confidence,
          state: null,
          elements: []
        }
      }
    }
  }

  runQuery(
    sessionId: string,
    driverStateStore: DriverStateStore,
    name: 'state' | 'locate',
    args: unknown,
    requestedDriverId?: string
  ): ActionResult {
    const current = driverStateStore.get(sessionId)

    if (!current || !current.driver) {
      return {
        ok: false,
        error: {
          message: 'No driver is active for this session'
        }
      }
    }

    if (requestedDriverId && requestedDriverId !== current.driver.id) {
      return {
        ok: false,
        error: {
          message: `Active driver mismatch: expected ${requestedDriverId}, got ${current.driver.id}`
        }
      }
    }

    if (name === 'state') {
      return {
        ok: true,
        value: {
          driverId: current.payload.driverId,
          confidence: current.payload.confidence,
          revision: current.payload.revision,
          state: current.payload.state,
          elements: current.payload.elements
        }
      }
    }

    return {
      ok: true,
      value: current.driver.locate(current.payload.state, args)
    }
  }

  async invoke(
    sessionId: string,
    action: { driver?: string; name: string; args?: unknown },
    io: DriverIO,
    driverStateStore: DriverStateStore
  ): Promise<ActionResult> {
    const current = driverStateStore.get(sessionId)

    if (!current || !current.driver) {
      return {
        ok: false,
        error: {
          message: 'No driver is active for this session'
        }
      }
    }

    if (action.driver && action.driver !== current.driver.id) {
      return {
        ok: false,
        error: {
          message: `Active driver mismatch: expected ${action.driver}, got ${current.driver.id}`
        }
      }
    }

    try {
      return await current.driver.invoke(
        {
          name: action.name,
          args: action.args
        },
        current.payload.state,
        io
      )
    } catch (error) {
      return {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : 'Driver action failed'
        }
      }
    }
  }

  private resolveDriver(
    snapshot: ScreenSnapshot,
    preferredDriverId?: string
  ): { driver: Driver; confidence: number } | null {
    if (preferredDriverId) {
      const preferred = this.drivers.get(preferredDriverId)

      if (!preferred) {
        return null
      }

      return {
        driver: preferred,
        confidence: preferred.detect(snapshot)
      }
    }

    let best: { driver: Driver; confidence: number } | null = null

    for (const driver of this.drivers.values()) {
      const confidence = driver.detect(snapshot)

      if (confidence <= 0) {
        continue
      }

      if (!best || confidence > best.confidence) {
        best = {
          driver,
          confidence
        }
      }
    }

    return best
  }
}

function sanitizeElements(elements: Element[]): Element[] {
  return elements.map((element) => ({
    ...element,
    actions: [...element.actions]
  }))
}
