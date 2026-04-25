import { AbortError, TimeoutError } from './errors.js'

export interface WaitOptions {
  timeout?: number
  signal?: AbortSignal
}

export interface WaitForConditionOptions<T> extends WaitOptions {
  condition: () => T | undefined
  subscribe?: (notify: () => void) => (() => void) | void
  terminalError?: () => Error | null
  defaultTimeout?: number
  description?: string
}

export const DEFAULT_TIMEOUT_MS = 5_000

export function resolveTimeoutMs(
  timeout: number | undefined,
  fallback = DEFAULT_TIMEOUT_MS
): number {
  return timeout ?? fallback
}

export function abortErrorFromSignal(signal: AbortSignal): AbortError {
  const reason =
    signal.reason instanceof Error
      ? signal.reason.message
      : typeof signal.reason === 'string'
        ? signal.reason
        : undefined

  return new AbortError(reason)
}

export async function waitForCondition<T>(
  options: WaitForConditionOptions<T>
): Promise<T> {
  const timeoutMs = resolveTimeoutMs(options.timeout, options.defaultTimeout)
  const signal = options.signal

  if (signal?.aborted) {
    throw abortErrorFromSignal(signal)
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false
    let timeout: ReturnType<typeof setTimeout> | null = null
    let unsubscribe: (() => void) | void = undefined
    let abortHandler: (() => void) | null = null

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout)
      }

      unsubscribe?.()

      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler)
      }
    }

    const fail = (error: Error) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      reject(error)
    }

    const succeed = (value: T) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      resolve(value)
    }

    const evaluate = () => {
      try {
        const value = options.condition()

        if (value !== undefined) {
          succeed(value)
          return
        }

        const terminal = options.terminalError?.()

        if (terminal) {
          fail(terminal)
        }
      } catch (error) {
        fail(error instanceof Error ? error : new Error('Wait failed'))
      }
    }

    unsubscribe = options.subscribe?.(evaluate)

    timeout = setTimeout(() => {
      const description = options.description ?? 'condition'
      fail(new TimeoutError(timeoutMs, `Timed out after ${timeoutMs}ms waiting for ${description}`))
    }, timeoutMs)

    evaluate()

    if (signal) {
      abortHandler = () => {
        fail(abortErrorFromSignal(signal))
      }
      signal.addEventListener('abort', abortHandler, { once: true })
    }
  })
}
