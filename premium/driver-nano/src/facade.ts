import {
  UsageError,
  type DriverClient,
  type Session,
  type WaitOptions
} from '@project-gateway/sdk'

import {
  type NanoAnchorDirection,
  type NanoBufferTarget,
  type NanoExecuteCommandOptions,
  type NanoExitOptions,
  NANO_DRIVER_ID,
  NANO_SUPPORTED_VERSION,
  type NanoMode,
  type NanoOpenFileOptions,
  type NanoReplaceOptions,
  type NanoSaveAsOptions,
  type NanoSearchOptions,
  type NanoSession,
  type NanoState
} from './types.js'

export async function attachNano(session: Session): Promise<NanoSession> {
  const driver = session.driver(NANO_DRIVER_ID)
  const current = asNanoState(driver.current()?.state)

  if (current && current.version.startsWith(NANO_SUPPORTED_VERSION)) {
    return new AttachedNanoSession(driver)
  }

  const state = await driver.waitForState((snapshot) => {
    const next = asNanoState(snapshot.state)
    return (
      snapshot.driverId === NANO_DRIVER_ID &&
      Boolean(next?.version.startsWith(NANO_SUPPORTED_VERSION))
    )
  })

  if (!asNanoState(state.state)) {
    throw new UsageError('The active session is not a supported nano session')
  }

  return new AttachedNanoSession(driver)
}

class AttachedNanoSession implements NanoSession {
  private readonly driver: DriverClient

  constructor(driver: DriverClient) {
    this.driver = driver
  }

  current(): NanoState | null {
    const current = this.driver.current()
    return asNanoState(current?.state)
  }

  async waitForMode(
    mode: NanoMode | readonly NanoMode[],
    options: WaitOptions = {}
  ): Promise<NanoState> {
    const modes = Array.isArray(mode) ? mode : [mode]
    const state = await this.driver.waitForState(
      (snapshot) => {
        const next = asNanoState(snapshot.state)
        return Boolean(next && modes.includes(next.mode))
      },
      options
    )
    const parsed = asNanoState(state.state)

    if (!parsed) {
      throw new UsageError('Nano state is unavailable')
    }

    return parsed
  }

  async insert(text: string): Promise<void> {
    await this.invoke('insert', {
      text
    })
  }

  async save(): Promise<void> {
    await this.invoke('save')
  }

  async saveAs(path: string, options = {} as NanoSaveAsOptions): Promise<void> {
    await this.invoke('saveAs', {
      path,
      viaBrowser: options.viaBrowser ?? false
    })
  }

  async search(query: string, options: NanoSearchOptions = {}): Promise<void> {
    await this.invoke('search', {
      query,
      ...options
    })
  }

  async replace(
    find: string,
    replacement: string,
    options: NanoReplaceOptions = {}
  ): Promise<void> {
    await this.invoke('replace', {
      find,
      replacement,
      ...options
    })
  }

  async toggleMark(): Promise<void> {
    await this.invoke('toggleMark')
  }

  async copySelection(): Promise<void> {
    await this.invoke('copySelection')
  }

  async cutSelection(): Promise<void> {
    await this.invoke('cutSelection')
  }

  async paste(): Promise<void> {
    await this.invoke('paste')
  }

  async undo(): Promise<void> {
    await this.invoke('undo')
  }

  async redo(): Promise<void> {
    await this.invoke('redo')
  }

  async openHelp(): Promise<void> {
    await this.invoke('openHelp')
  }

  async closeHelp(): Promise<void> {
    await this.invoke('closeHelp')
  }

  async openFile(path: string, options: NanoOpenFileOptions = {}): Promise<void> {
    await this.invoke('openFile', {
      path,
      viaBrowser: options.viaBrowser ?? false
    })
  }

  async executeCommand(
    command: string,
    options: NanoExecuteCommandOptions = {}
  ): Promise<void> {
    await this.invoke('executeCommand', {
      command,
      ...options
    })
  }

  async runSpeller(): Promise<void> {
    await this.invoke('runSpeller')
  }

  async runFormatter(): Promise<void> {
    await this.invoke('runFormatter')
  }

  async runLinter(): Promise<void> {
    await this.invoke('runLinter')
  }

  async jumpNextLint(): Promise<void> {
    await this.invoke('jumpNextLint')
  }

  async jumpPrevLint(): Promise<void> {
    await this.invoke('jumpPrevLint')
  }

  async recordMacro(): Promise<void> {
    await this.invoke('recordMacro')
  }

  async playMacro(): Promise<void> {
    await this.invoke('playMacro')
  }

  async placeAnchor(): Promise<void> {
    await this.invoke('placeAnchor')
  }

  async jumpAnchor(direction: NanoAnchorDirection): Promise<void> {
    await this.invoke('jumpAnchor', {
      direction
    })
  }

  async switchBuffer(target: NanoBufferTarget): Promise<void> {
    await this.invoke('switchBuffer', {
      target
    })
  }

  async exit(options: NanoExitOptions = {}): Promise<void> {
    await this.driver.invoke('exit', options)
  }

  private async invoke(name: string, args?: unknown): Promise<NanoState> {
    const result = asNanoState(await this.driver.invoke(name, args))

    if (!result) {
      throw new UsageError(`Nano action ${name} did not return nano state`)
    }

    return result
  }
}

function asNanoState(value: unknown): NanoState | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<NanoState>

  if (
    typeof candidate.version !== 'string' ||
    typeof candidate.mode !== 'string' ||
    !Array.isArray(candidate.visibleText)
  ) {
    return null
  }

  return candidate as NanoState
}
