import type { ScreenSnapshot } from '@terminal-use/protocol'

import { UsageError } from './errors.js'
import type { WaitOptions } from './wait.js'
import { waitForCondition } from './wait.js'

export type TextQuery = string | RegExp

export interface Locator extends TextMatchHandle {
  waitFor(options?: LocatorWaitOptions): Promise<void>
}

export interface LocatorWaitOptions extends WaitOptions {
  state?: 'visible' | 'hidden'
}

export interface TextMatchHandle {
  count(): number
  isVisible(): boolean
}

export interface LocatorDependencies {
  query: TextQuery
  getSnapshot: () => ScreenSnapshot
  subscribe: (listener: () => void) => () => void
  getDefaultTimeout: () => number
  getTerminalError: () => Error | null
}

export class SdkLocator implements Locator {
  private readonly query: TextQuery
  private readonly getSnapshotValue: () => ScreenSnapshot
  private readonly subscribeValue: (listener: () => void) => () => void
  private readonly getDefaultTimeoutValue: () => number
  private readonly getTerminalErrorValue: () => Error | null

  constructor(dependencies: LocatorDependencies) {
    if (typeof dependencies.query === 'string' && dependencies.query.length === 0) {
      throw new UsageError('Locator query must not be empty')
    }

    this.query = dependencies.query
    this.getSnapshotValue = dependencies.getSnapshot
    this.subscribeValue = dependencies.subscribe
    this.getDefaultTimeoutValue = dependencies.getDefaultTimeout
    this.getTerminalErrorValue = dependencies.getTerminalError
  }

  count(): number {
    return countTextMatches(this.getSnapshotValue().plainTextLines, this.query)
  }

  isVisible(): boolean {
    return this.count() > 0
  }

  async waitFor(options: LocatorWaitOptions = {}): Promise<void> {
    const state = options.state ?? 'visible'

    await waitForCondition<boolean>({
      condition: () => {
        const visible = this.isVisible()

        if (state === 'visible' ? visible : !visible) {
          return true
        }

        return undefined
      },
      subscribe: (notify) => this.subscribeValue(notify),
      terminalError: () => {
        const visible = this.isVisible()

        if (state === 'hidden' && !visible) {
          return null
        }

        return this.getTerminalErrorValue()
      },
      timeout: options.timeout,
      signal: options.signal,
      defaultTimeout: this.getDefaultTimeoutValue(),
      description: `${state} text ${describeQuery(this.query)}`
    })
  }
}

export function countTextMatches(lines: string[], query: TextQuery): number {
  return lines.reduce((total, line) => total + countLineMatches(line, query), 0)
}

export function hasTextMatch(lines: string[], query: TextQuery): boolean {
  return countTextMatches(lines, query) > 0
}

function countLineMatches(line: string, query: TextQuery): number {
  if (typeof query === 'string') {
    if (query.length === 0) {
      return 0
    }

    let count = 0
    let index = 0

    while (index <= line.length - query.length) {
      const found = line.indexOf(query, index)

      if (found === -1) {
        break
      }

      count += 1
      index = found + query.length
    }

    return count
  }

  const expression = new RegExp(query.source, query.flags.includes('g') ? query.flags : `${query.flags}g`)
  let count = 0

  while (true) {
    const match = expression.exec(line)

    if (!match) {
      return count
    }

    count += 1

    if (match[0].length === 0) {
      expression.lastIndex += 1
    }
  }
}

function describeQuery(query: TextQuery): string {
  return typeof query === 'string' ? `"${query}"` : query.toString()
}
