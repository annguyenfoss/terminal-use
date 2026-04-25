import type { Element } from '@terminal-use/protocol'

import { ProtocolError, UsageError } from './errors.js'
import { waitForCondition, type WaitOptions } from './wait.js'

export type DriverQueryName = 'state' | 'locate'

export interface DriverStateSnapshot {
  driverId: string | null
  confidence: number
  revision: number
  state: unknown | null
  elements: Element[]
}

export interface DriverClient {
  current(): DriverStateSnapshot | null
  onEvent(listener: (state: DriverStateSnapshot) => void): () => void
  waitForState(
    predicate: (state: DriverStateSnapshot) => boolean,
    options?: WaitOptions
  ): Promise<DriverStateSnapshot>
  query(name: DriverQueryName, args?: unknown): Promise<unknown>
  invoke(name: string, args?: unknown): Promise<unknown>
}

export interface DriverClientDependencies {
  getCurrent: () => DriverStateSnapshot | null
  subscribe: (listener: () => void) => () => void
  getDefaultTimeout: () => number
  getTerminalError: () => Error | null
  query: (driverId: string | undefined, name: DriverQueryName, args?: unknown) => Promise<unknown>
  invoke: (driverId: string | undefined, name: string, args?: unknown) => Promise<unknown>
}

export class SdkDriverClient implements DriverClient {
  private readonly requestedDriverId: string | undefined
  private readonly dependencies: DriverClientDependencies

  constructor(
    requestedDriverId: string | undefined,
    dependencies: DriverClientDependencies
  ) {
    this.requestedDriverId = requestedDriverId
    this.dependencies = dependencies
  }

  current(): DriverStateSnapshot | null {
    const current = this.dependencies.getCurrent()

    if (!current) {
      return null
    }

    if (this.requestedDriverId && current.driverId !== this.requestedDriverId) {
      return null
    }

    return cloneDriverState(current)
  }

  onEvent(listener: (state: DriverStateSnapshot) => void): () => void {
    const current = this.current()

    if (current) {
      listener(current)
    }

    return this.dependencies.subscribe(() => {
      const next = this.current()

      if (next) {
        listener(next)
      }
    })
  }

  async waitForState(
    predicate: (state: DriverStateSnapshot) => boolean,
    options: WaitOptions = {}
  ): Promise<DriverStateSnapshot> {
    return waitForCondition({
      timeout: options.timeout,
      signal: options.signal,
      subscribe: (listener) => this.dependencies.subscribe(listener),
      terminalError: () => this.dependencies.getTerminalError(),
      defaultTimeout: this.dependencies.getDefaultTimeout(),
      description: this.requestedDriverId
        ? `driver state for ${this.requestedDriverId}`
        : 'driver state',
      condition: () => {
        const current = this.current()

        if (!current) {
          return undefined
        }

        return predicate(current) ? current : undefined
      }
    })
  }

  async query(name: DriverQueryName, args?: unknown): Promise<unknown> {
    return this.dependencies.query(this.requestedDriverId, name, args)
  }

  async invoke(name: string, args?: unknown): Promise<unknown> {
    const driverId = this.requestedDriverId ?? this.current()?.driverId ?? undefined

    if (!driverId) {
      throw new UsageError('No active driver is available for invoke()')
    }

    return this.dependencies.invoke(driverId, name, args)
  }
}

export function unwrapDriverResult(
  result: { ok: boolean; value?: unknown; error?: unknown },
  code: string
): unknown {
  if (result.ok) {
    return result.value
  }

  const message =
    result.error &&
    typeof result.error === 'object' &&
    'message' in result.error &&
    typeof result.error.message === 'string'
      ? result.error.message
      : code

  throw new ProtocolError(code, message, {
    details: result.error
  })
}

function cloneDriverState(state: DriverStateSnapshot): DriverStateSnapshot {
  return {
    driverId: state.driverId,
    confidence: state.confidence,
    revision: state.revision,
    state: state.state,
    elements: state.elements.map((element) => ({
      ...element,
      box: element.box ? { ...element.box } : undefined,
      actions: [...element.actions]
    }))
  }
}
