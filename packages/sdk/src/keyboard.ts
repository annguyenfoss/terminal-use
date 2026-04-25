import { UsageError } from './errors.js'

export const SUPPORTED_KEYS = [
  'Enter',
  'Tab',
  'Backspace',
  'Escape',
  'Up',
  'Down',
  'Left',
  'Right',
  'Ctrl+C',
  'Ctrl+D',
  'Ctrl+L'
] as const

const SUPPORTED_KEY_SET = new Set<string>(SUPPORTED_KEYS)

export type SupportedKey = (typeof SUPPORTED_KEYS)[number]

export interface Keyboard {
  type(text: string): Promise<void>
  paste(text: string): Promise<void>
  press(key: SupportedKey): Promise<void>
}

export interface KeyboardDependencies {
  type: (text: string) => Promise<void>
  paste: (text: string) => Promise<void>
  press: (key: SupportedKey) => Promise<void>
}

export class SdkKeyboard implements Keyboard {
  private readonly typeValue: (text: string) => Promise<void>
  private readonly pasteValue: (text: string) => Promise<void>
  private readonly pressValue: (key: SupportedKey) => Promise<void>

  constructor(dependencies: KeyboardDependencies) {
    this.typeValue = dependencies.type
    this.pasteValue = dependencies.paste
    this.pressValue = dependencies.press
  }

  async type(text: string): Promise<void> {
    await this.typeValue(text)
  }

  async paste(text: string): Promise<void> {
    await this.pasteValue(text)
  }

  async press(key: SupportedKey): Promise<void> {
    if (!SUPPORTED_KEY_SET.has(key)) {
      throw new UsageError(`Unsupported key: ${key}`)
    }

    await this.pressValue(key)
  }
}
