import type { ElementBox } from '@terminal-use/protocol'
import type { ManagedLaunchProfileResolver } from '@terminal-use/host'
import type { Session, WaitOptions } from '@terminal-use/sdk'

export const HTOP_DRIVER_ID = 'htop'
export const HTOP_LAUNCH_PROFILE = 'htop'
export const HTOP_SUPPORTED_VERSION = '3.5'

export type HtopMode = 'main' | 'search' | 'filter' | 'signalMenu'
export type HtopSortPreset = 'pid' | 'cpu' | 'memory' | 'time'

export interface HtopCapabilities {
  version: string
  search: boolean
  filter: boolean
  treeView: boolean
  signalMenu: boolean
  sortPresets: readonly HtopSortPreset[]
  strace: boolean
  lsof: boolean
  gdb: boolean
}

export interface HtopTab {
  name: string
  active: boolean
  box: ElementBox
}

export interface HtopMeter {
  label: string
  text: string
  box: ElementBox
}

export interface HtopProcessHeaderColumn {
  key:
    | 'pid'
    | 'user'
    | 'priority'
    | 'nice'
    | 'virt'
    | 'resident'
    | 'share'
    | 'state'
    | 'cpu'
    | 'memory'
    | 'time'
    | 'command'
  label: string
  x: number
  width: number
  activeSort: boolean
}

export interface HtopProcessHeader {
  text: string
  y: number
  sort: HtopSortPreset | null
  columns: HtopProcessHeaderColumn[]
  box: ElementBox
}

export interface HtopProcessRow {
  y: number
  pid: number | null
  user: string | null
  priority: string
  nice: string
  virt: string
  resident: string
  share: string
  state: string | null
  cpu: string
  memory: string
  time: string
  command: string
  selected: boolean
  box: ElementBox
}

export interface HtopPrompt {
  kind: 'search' | 'filter'
  label: string
  input: string
  box: ElementBox
}

export interface HtopSignalOption {
  y: number
  signal: number
  name: string
  selected: boolean
  box: ElementBox
}

export interface HtopLayout {
  tabsRow: number | null
  headerRow: number | null
  footerRow: number
  processStartRow: number | null
  processEndRow: number | null
}

export interface HtopState {
  version: string
  mode: HtopMode
  title: string | null
  tabs: HtopTab[]
  activeTab: string | null
  meters: HtopMeter[]
  header: HtopProcessHeader | null
  processes: HtopProcessRow[]
  selectedIndex: number | null
  selectedProcess: HtopProcessRow | null
  treeView: boolean
  prompt: HtopPrompt | null
  signalOptions: HtopSignalOption[]
  selectedSignal: number | null
  functionBar: string[]
  capabilities: HtopCapabilities
  layout: HtopLayout
}

export interface HtopLocateQuery {
  role?: string
  text?: string | RegExp
}

export interface HtopProfileArgs {
  pids?: number[]
  readonly?: boolean
}

export interface HtopLaunchProfileOptions {
  command?: string
  cwd?: string
  rows?: number
  cols?: number
}

export interface HtopDriverOptions {
  command?: string
}

export interface HtopSession {
  current(): HtopState | null
  waitForMode(
    mode: HtopMode | readonly HtopMode[],
    options?: WaitOptions
  ): Promise<HtopState>
  moveSelection(direction: 'up' | 'down', count?: number): Promise<void>
  page(direction: 'up' | 'down'): Promise<void>
  home(): Promise<void>
  end(): Promise<void>
  scrollHorizontal(direction: 'left' | 'right', count?: number): Promise<void>
  toggleTree(): Promise<void>
  search(text: string): Promise<void>
  filter(text: string): Promise<void>
  clearFilter(): Promise<void>
  sortBy(preset: HtopSortPreset): Promise<void>
  killSelected(signal?: number | string): Promise<void>
  refresh(): Promise<void>
  quit(): Promise<void>
}

export type HtopAttachSession = Session
export type HtopLaunchProfile = ManagedLaunchProfileResolver
