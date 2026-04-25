import { constants as osConstants } from 'node:os'

import * as nodePty from 'node-pty'
import type { IPty, IPtyForkOptions } from 'node-pty'

type DataListener = (data: string) => void
type ExitListener = (event: { exitCode: number; signal: string | null }) => void

export interface PtySessionOptions {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string | undefined>
  cols: number
  rows: number
}

export class PtySession {
  readonly command: string
  readonly args: string[]
  readonly cwd?: string

  private readonly pty: IPty
  private readonly dataListeners = new Set<DataListener>()
  private readonly exitListeners = new Set<ExitListener>()
  private stopTimer: NodeJS.Timeout | null = null
  private exited = false
  private exitInfo: { exitCode: number; signal: string | null } | null = null

  constructor(options: PtySessionOptions) {
    this.command = options.command
    this.args = options.args
    this.cwd = options.cwd

    const forkOptions: IPtyForkOptions = {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd,
      env: options.env
    }

    this.pty = nodePty.spawn(options.command, options.args, forkOptions)
    this.pty.onData((data) => {
      for (const listener of this.dataListeners) {
        listener(data)
      }
    })
    this.pty.onExit((event) => {
      this.exited = true
      this.exitInfo = {
        exitCode: event.exitCode,
        signal: toSignalName(event.signal)
      }

      if (this.stopTimer) {
        clearTimeout(this.stopTimer)
        this.stopTimer = null
      }

      for (const listener of this.exitListeners) {
        listener(this.exitInfo)
      }
    })
  }

  get pid(): number {
    return this.pty.pid
  }

  get cols(): number {
    return this.pty.cols
  }

  get rows(): number {
    return this.pty.rows
  }

  get hasExited(): boolean {
    return this.exited
  }

  get lastExit(): { exitCode: number; signal: string | null } | null {
    return this.exitInfo
  }

  onData(listener: DataListener): () => void {
    this.dataListeners.add(listener)
    return () => {
      this.dataListeners.delete(listener)
    }
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener)
    return () => {
      this.exitListeners.delete(listener)
    }
  }

  write(data: string): void {
    this.pty.write(data)
  }

  resize(cols: number, rows: number): void {
    this.pty.resize(cols, rows)
  }

  stop(graceMs = 500): void {
    if (this.exited) {
      return
    }

    this.pty.kill('SIGTERM')
    this.stopTimer = setTimeout(() => {
      if (!this.exited) {
        this.pty.kill('SIGKILL')
      }
    }, graceMs)
  }

  dispose(): void {
    if (!this.exited) {
      this.pty.kill('SIGKILL')
    }

    if (this.stopTimer) {
      clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
  }
}

function toSignalName(signal?: number): string | null {
  if (signal === undefined) {
    return null
  }

  const entries = Object.entries(osConstants.signals) as Array<[string, number]>
  const match = entries.find(([, value]) => value === signal)
  return match?.[0] ?? String(signal)
}
