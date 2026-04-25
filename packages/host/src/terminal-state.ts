import { createRequire } from 'node:module'

import type { ScreenPatch, ScreenSnapshot } from '@project-gateway/protocol'
import type { Unicode11Addon as XtermUnicode11Addon } from '@xterm/addon-unicode11'
import type {
  IModes,
  ITerminalInitOnlyOptions,
  ITerminalOptions,
  Terminal as XtermTerminal
} from '@xterm/headless'

import { buildScreenPatch } from './patch-builder.js'
import { buildScreenSnapshot } from './snapshot-builder.js'

type PatchListener = (patch: ScreenPatch) => void

type TerminalConstructor = new (
  options?: ITerminalOptions & ITerminalInitOnlyOptions
) => XtermTerminal
type Unicode11AddonConstructor = new () => XtermUnicode11Addon

const require = createRequire(import.meta.url)
const { Terminal } = require('@xterm/headless') as {
  Terminal: TerminalConstructor
}
const { Unicode11Addon } = require('@xterm/addon-unicode11') as {
  Unicode11Addon: Unicode11AddonConstructor
}

export interface TerminalStateChange {
  snapshot: ScreenSnapshot
  patch: ScreenPatch | null
}

export class TerminalState {
  readonly terminal: XtermTerminal

  private revision = 0
  private currentTitle: string | null = null
  private latestSnapshot: ScreenSnapshot
  private readonly patchListeners = new Set<PatchListener>()
  private queue = Promise.resolve()

  constructor(cols: number, rows: number, scrollback = 1000) {
    this.terminal = new Terminal({
      allowProposedApi: true,
      cols,
      rows,
      scrollback
    })
    this.terminal.loadAddon(new Unicode11Addon())
    this.terminal.unicode.activeVersion = '11'
    this.terminal.onTitleChange((title) => {
      this.currentTitle = title
    })
    this.latestSnapshot = buildScreenSnapshot(this.terminal, {
      revision: this.revision,
      title: this.currentTitle
    })
  }

  get snapshot(): ScreenSnapshot {
    return this.latestSnapshot
  }

  get modes(): IModes {
    return this.terminal.modes
  }

  onPatch(listener: PatchListener): () => void {
    this.patchListeners.add(listener)
    return () => {
      this.patchListeners.delete(listener)
    }
  }

  ingest(data: string): Promise<TerminalStateChange | null> {
    return this.enqueue(async () => {
      await writeToTerminal(this.terminal, data)
      return this.commit('patch')
    })
  }

  resize(cols: number, rows: number): Promise<TerminalStateChange | null> {
    return this.enqueue(async () => {
      this.terminal.resize(cols, rows)
      return this.commit('snapshot')
    })
  }

  dispose(): void {
    this.patchListeners.clear()
    this.terminal.dispose()
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task)
    this.queue = next.then(
      () => undefined,
      () => undefined
    )
    return next
  }

  private commit(kind: 'patch' | 'snapshot'): TerminalStateChange | null {
    const nextSnapshot = buildScreenSnapshot(this.terminal, {
      revision: this.revision + 1,
      title: this.currentTitle
    })

    const diff = buildScreenPatch(this.latestSnapshot, nextSnapshot)

    if (!diff.changed && kind === 'patch') {
      return null
    }

    this.revision = nextSnapshot.revision
    this.latestSnapshot = nextSnapshot

    if (kind === 'patch' && diff.changed) {
      for (const listener of this.patchListeners) {
        listener(diff.patch)
      }

      return {
        snapshot: nextSnapshot,
        patch: diff.patch
      }
    }

    return {
      snapshot: nextSnapshot,
      patch: diff.changed ? diff.patch : null
    }
  }
}

function writeToTerminal(
  terminal: XtermTerminal,
  data: string
): Promise<void> {
  return new Promise((resolve) => {
    terminal.write(data, resolve)
  })
}
