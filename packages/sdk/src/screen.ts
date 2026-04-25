import type { ScreenPatch, ScreenSnapshot } from '@terminal-use/protocol'

import type { Locator, TextQuery } from './locator.js'
import { SdkLocator } from './locator.js'
import type { WaitOptions } from './wait.js'

export interface Screen {
  current(): ScreenSnapshot
  refresh(options?: WaitOptions): Promise<ScreenSnapshot>
  visibleLines(): string[]
  visibleText(): string
  locator(query: TextQuery): Locator
}

export interface ScreenDependencies {
  getSnapshot: () => ScreenSnapshot
  refresh: (options?: WaitOptions) => Promise<ScreenSnapshot>
  subscribe: (listener: () => void) => () => void
  getDefaultTimeout: () => number
  getTerminalError: () => Error | null
}

export class SdkScreen implements Screen {
  private readonly getSnapshotValue: () => ScreenSnapshot
  private readonly refreshValue: (options?: WaitOptions) => Promise<ScreenSnapshot>
  private readonly subscribeValue: (listener: () => void) => () => void
  private readonly getDefaultTimeoutValue: () => number
  private readonly getTerminalErrorValue: () => Error | null

  constructor(dependencies: ScreenDependencies) {
    this.getSnapshotValue = dependencies.getSnapshot
    this.refreshValue = dependencies.refresh
    this.subscribeValue = dependencies.subscribe
    this.getDefaultTimeoutValue = dependencies.getDefaultTimeout
    this.getTerminalErrorValue = dependencies.getTerminalError
  }

  current(): ScreenSnapshot {
    return cloneScreenSnapshot(this.getSnapshotValue())
  }

  async refresh(options?: WaitOptions): Promise<ScreenSnapshot> {
    return this.refreshValue(options)
  }

  visibleLines(): string[] {
    return [...this.getSnapshotValue().plainTextLines]
  }

  visibleText(): string {
    return this.visibleLines().join('\n')
  }

  locator(query: TextQuery): Locator {
    return new SdkLocator({
      query,
      getSnapshot: this.getSnapshotValue,
      subscribe: this.subscribeValue,
      getDefaultTimeout: this.getDefaultTimeoutValue,
      getTerminalError: this.getTerminalErrorValue
    })
  }
}

export function cloneScreenSnapshot(snapshot: ScreenSnapshot): ScreenSnapshot {
  return {
    ...snapshot,
    cursor: { ...snapshot.cursor },
    lines: snapshot.lines.map((line) => line.map((cell) => ({ ...cell }))),
    plainTextLines: [...snapshot.plainTextLines],
    scrollbackLines: [...snapshot.scrollbackLines]
  }
}

export function applyScreenPatch(
  snapshot: ScreenSnapshot,
  patch: ScreenPatch
): ScreenSnapshot | null {
  if (snapshot.revision !== patch.fromRevision) {
    return null
  }

  const next = cloneScreenSnapshot(snapshot)
  next.revision = patch.toRevision

  for (const row of patch.rows) {
    if (row.y >= next.rows) {
      return null
    }

    next.lines[row.y] = row.cells.map((cell) => ({ ...cell }))
    next.plainTextLines[row.y] = row.text
  }

  if (patch.cursor) {
    next.cursor = { ...patch.cursor }
  }

  if (patch.title !== undefined) {
    next.title = patch.title
  }

  if (patch.activeBuffer) {
    next.activeBuffer = patch.activeBuffer
  }

  return next
}
