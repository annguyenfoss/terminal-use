import type { ElementBox } from '@terminal-use/protocol'
import type { ManagedLaunchProfileResolver } from '@terminal-use/host'
import type { Session, WaitOptions } from '@terminal-use/sdk'

export const NANO_DRIVER_ID = 'nano'
export const NANO_LAUNCH_PROFILE = 'nano'
export const NANO_SUPPORTED_VERSION = '9.0'

export type NanoMode =
  | 'editor'
  | 'help'
  | 'browser'
  | 'search'
  | 'replace'
  | 'replaceWith'
  | 'writeOut'
  | 'yesNo'
  | 'readFile'
  | 'execute'
  | 'linter'

export type NanoPromptKind =
  | 'search'
  | 'replace'
  | 'replaceWith'
  | 'writeOut'
  | 'yesNo'
  | 'readFile'
  | 'goToDirectory'
  | 'execute'

export interface NanoShortcut {
  key: string
  label: string
  box: ElementBox
}

export interface NanoPrompt {
  kind: NanoPromptKind
  text: string
  input: string | null
  toggles: string[]
}

export interface NanoBrowserEntry {
  text: string
  selected: boolean
  y: number
}

export interface NanoBrowserState {
  cwd: string | null
  entries: NanoBrowserEntry[]
  selectedIndex: number | null
  selectedText: string | null
}

export interface NanoRegions {
  titleBar: ElementBox
  editViewport: ElementBox
  statusBar: ElementBox
  helpLines: ElementBox
}

export interface NanoSearchOptions {
  backwards?: boolean
  caseSensitive?: boolean
  regex?: boolean
}

export interface NanoReplaceOptions extends NanoSearchOptions {
  all?: boolean
}

export interface NanoSaveAsOptions {
  viaBrowser?: boolean
}

export interface NanoExecuteCommandOptions {
  pipe?: boolean
}

export interface NanoExitOptions {
  save?: 'yes' | 'no' | 'cancel'
}

export type NanoBufferTarget = 'prev' | 'next' | number
export type NanoAnchorDirection = 'prev' | 'next'

export interface NanoState {
  version: string
  mode: NanoMode
  fileName: string | null
  modified: boolean
  statusMessage: string | null
  markActive: boolean
  macroRecording: boolean
  bufferIndex: number | null
  bufferCount: number | null
  anchorLines: number[]
  titleBar: string
  statusBar: string
  prompt: NanoPrompt | null
  browser: NanoBrowserState | null
  visibleText: string[]
  helpShortcuts: NanoShortcut[]
  capabilities: NanoCapabilities
  regions: NanoRegions
}

export interface NanoCapabilities {
  version: string
  helpViewer: boolean
  fileBrowser: boolean
  managedProfile: boolean
  multibuffer: boolean
  speller: boolean
  formatter: boolean
  linter: boolean
  macros: boolean
  anchors: boolean
  restrictedMode: boolean
  readOnly: boolean
}

export interface NanoLocateQuery {
  text?: string | RegExp
  role?: string
}

export interface NanoProfileArgs {
  file?: string
}

export interface NanoLaunchProfileOptions {
  command?: string
  cwd?: string
  rows?: number
  cols?: number
}

export interface NanoOpenFileOptions {
  viaBrowser?: boolean
}

export interface NanoSession {
  current(): NanoState | null
  waitForMode(
    mode: NanoMode | readonly NanoMode[],
    options?: WaitOptions
  ): Promise<NanoState>
  insert(text: string): Promise<void>
  save(): Promise<void>
  saveAs(path: string, options?: NanoSaveAsOptions): Promise<void>
  search(query: string, options?: NanoSearchOptions): Promise<void>
  replace(
    find: string,
    replacement: string,
    options?: NanoReplaceOptions
  ): Promise<void>
  toggleMark(): Promise<void>
  copySelection(): Promise<void>
  cutSelection(): Promise<void>
  paste(): Promise<void>
  undo(): Promise<void>
  redo(): Promise<void>
  openHelp(): Promise<void>
  closeHelp(): Promise<void>
  openFile(path: string, options?: NanoOpenFileOptions): Promise<void>
  executeCommand(command: string, options?: NanoExecuteCommandOptions): Promise<void>
  runSpeller(): Promise<void>
  runFormatter(): Promise<void>
  runLinter(): Promise<void>
  jumpNextLint(): Promise<void>
  jumpPrevLint(): Promise<void>
  recordMacro(): Promise<void>
  playMacro(): Promise<void>
  placeAnchor(): Promise<void>
  jumpAnchor(direction: NanoAnchorDirection): Promise<void>
  switchBuffer(target: NanoBufferTarget): Promise<void>
  exit(options?: NanoExitOptions): Promise<void>
}

export type NanoAttachSession = Session
export type NanoLaunchProfile = ManagedLaunchProfileResolver
