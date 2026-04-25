import {
  UsageError,
  type DriverClient,
  type Session,
  type WaitOptions
} from '@project-gateway/sdk'

import {
  HTOP_DRIVER_ID,
  HTOP_SUPPORTED_VERSION,
  type HtopMode,
  type HtopSession,
  type HtopSortPreset,
  type HtopState
} from './types.js'

export async function attachHtop(session: Session): Promise<HtopSession> {
  const driver = session.driver(HTOP_DRIVER_ID)
  const current = asHtopState(driver.current()?.state)

  if (isUsableHtopState(current)) {
    return new AttachedHtopSession(driver)
  }

  const state = await driver.waitForState((snapshot) => {
    const next = asHtopState(snapshot.state)
    return (
      snapshot.driverId === HTOP_DRIVER_ID &&
      isUsableHtopState(next)
    )
  })

  if (!asHtopState(state.state)) {
    throw new UsageError('The active session is not a supported htop session')
  }

  return new AttachedHtopSession(driver)
}

class AttachedHtopSession implements HtopSession {
  private readonly driver: DriverClient
  private latest: HtopState | null

  constructor(driver: DriverClient) {
    this.driver = driver
    this.latest = asHtopState(driver.current()?.state)
  }

  current(): HtopState | null {
    const current = asHtopState(this.driver.current()?.state)

    if (current) {
      this.latest = current
    }

    return this.latest
  }

  async waitForMode(
    mode: HtopMode | readonly HtopMode[],
    options: WaitOptions = {}
  ): Promise<HtopState> {
    const modes = Array.isArray(mode) ? mode : [mode]
    const current = this.current()

    if (current && modes.includes(current.mode)) {
      return current
    }

    const state = await this.driver.waitForState(
      (snapshot) => {
        const next = asHtopState(snapshot.state)
        return Boolean(next && modes.includes(next.mode))
      },
      options
    )
    const parsed = asHtopState(state.state)

    if (!parsed) {
      throw new UsageError('htop state is unavailable')
    }

    this.latest = parsed
    return parsed
  }

  async moveSelection(direction: 'up' | 'down', count = 1): Promise<void> {
    await this.invoke('moveSelection', { direction, count })
  }

  async page(direction: 'up' | 'down'): Promise<void> {
    await this.invoke('page', { direction })
  }

  async home(): Promise<void> {
    await this.invoke('home')
  }

  async end(): Promise<void> {
    await this.invoke('end')
  }

  async scrollHorizontal(
    direction: 'left' | 'right',
    count = 1
  ): Promise<void> {
    await this.invoke('scrollHorizontal', { direction, count })
  }

  async toggleTree(): Promise<void> {
    await this.invoke('toggleTree')
  }

  async search(text: string): Promise<void> {
    await this.invoke('search', { text })
  }

  async filter(text: string): Promise<void> {
    await this.invoke('filter', { text })
  }

  async clearFilter(): Promise<void> {
    await this.invoke('clearFilter')
  }

  async sortBy(preset: HtopSortPreset): Promise<void> {
    await this.invoke('sortBy', { preset })
  }

  async killSelected(signal?: number | string): Promise<void> {
    await this.invoke('killSelected', signal === undefined ? {} : { signal })
  }

  async refresh(): Promise<void> {
    await this.invoke('refresh')
  }

  async quit(): Promise<void> {
    await this.driver.invoke('quit')
  }

  private async invoke(name: string, args?: unknown): Promise<void> {
    const result = asHtopState(await this.driver.invoke(name, args))

    if (result) {
      this.latest = result
    }
  }
}

function asHtopState(value: unknown): HtopState | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<HtopState>

  if (
    typeof candidate.version !== 'string' ||
    typeof candidate.mode !== 'string' ||
    !Array.isArray(candidate.processes)
  ) {
    return null
  }

  return candidate as HtopState
}

function isUsableHtopState(value: HtopState | null): boolean {
  if (!value || !value.version.startsWith(HTOP_SUPPORTED_VERSION)) {
    return false
  }

  if (value.mode === 'signalMenu') {
    return value.signalOptions.length > 0
  }

  if (value.mode === 'search' || value.mode === 'filter') {
    return value.prompt !== null
  }

  return value.activeTab !== null || value.processes.length > 0
}
