import type { Driver } from '@project-gateway/driver-kit'
import type { SemanticEventPayload } from '@project-gateway/protocol'

export interface StoredDriverState {
  driver: Driver | null
  payload: SemanticEventPayload
  signature: string
}

export class DriverStateStore {
  private readonly states = new Map<string, StoredDriverState>()

  get(sessionId: string): StoredDriverState | null {
    return this.states.get(sessionId) ?? null
  }

  upsert(
    sessionId: string,
    next: Omit<StoredDriverState, 'signature'> & { signature?: string }
  ): { changed: boolean; current: StoredDriverState } {
    const signature =
      next.signature ??
      JSON.stringify({
        driverId: next.payload.driverId,
        confidence: next.payload.confidence,
        state: next.payload.state,
        elements: next.payload.elements
      })
    const current: StoredDriverState = {
      driver: next.driver,
      payload: next.payload,
      signature
    }
    const previous = this.states.get(sessionId)
    const changed =
      !previous ||
      previous.signature !== signature ||
      previous.payload.driverId !== current.payload.driverId

    this.states.set(sessionId, current)

    return {
      changed,
      current
    }
  }

  delete(sessionId: string): void {
    this.states.delete(sessionId)
  }
}
