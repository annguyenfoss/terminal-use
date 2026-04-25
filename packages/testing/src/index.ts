import { fileURLToPath } from 'node:url'

import {
  createBox,
  createElement,
  getVisibleRows,
  type ActionResult,
  type Driver,
  type DriverIO
} from '@terminal-use/driver-kit'
import type { Element, ScreenSnapshot } from '@terminal-use/protocol'

export const TESTING_PACKAGE_NAME = '@terminal-use/testing'
export const DETERMINISTIC_DEMO_DRIVER_ID = 'deterministic-demo'

export type DeterministicDemoMode = 'list' | 'details' | 'confirm'

export interface DeterministicDemoState {
  mode: DeterministicDemoMode
  items: string[]
  selectedIndex: number
  selectedLabel: string | null
  status: string
  confirmOpen: boolean
}

export interface DeterministicDemoLocateQuery {
  text?: string
  role?: string
}

export interface DeterministicDemoLaunchProfile {
  command: string
  args: string[]
  rows: number
  cols: number
  driver: string
}

export interface DeterministicDemoHostConfig {
  drivers: [Driver<DeterministicDemoState, { actions: string[] }>]
  launchProfiles: {
    'deterministic-demo': DeterministicDemoLaunchProfile
  }
}

const DETAILS_ROLE = 'details'
const DIALOG_ROLE = 'dialog'
const HINTS_ROLE = 'hints'
const ITEM_ROLE = 'listitem'
const STATUS_ROLE = 'statusbar'

export function createDeterministicDemoLaunchProfile(): DeterministicDemoLaunchProfile {
  return {
    command: process.execPath,
    args: [fileURLToPath(new URL('../runtime/deterministic-demo.mjs', import.meta.url))],
    rows: 20,
    cols: 80,
    driver: DETERMINISTIC_DEMO_DRIVER_ID
  }
}

export function createDeterministicDemoDriver(): Driver<DeterministicDemoState, { actions: string[] }> {
  return {
    id: DETERMINISTIC_DEMO_DRIVER_ID,
    version: '0.1.0',
    detect(snapshot) {
      const text = snapshot.plainTextLines.join('\n')
      return text.includes('Deterministic Demo') && text.includes('Status:')
        ? 1
        : 0
    },
    capabilities() {
      return {
        actions: [
          'moveNext',
          'movePrev',
          'openSelected',
          'requestDelete',
          'confirmDelete',
          'cancel'
        ]
      }
    },
    parse(snapshot) {
      return parseDeterministicDemoState(snapshot)
    },
    locate(state, query) {
      const elements = buildElements(state)

      if (!query || typeof query !== 'object') {
        return elements
      }

      const typedQuery = query as DeterministicDemoLocateQuery

      return elements.filter((element) => {
        if (typedQuery.role && element.role !== typedQuery.role) {
          return false
        }

        if (typedQuery.text) {
          const haystacks = [element.name, element.text].filter(Boolean)
          return haystacks.some((value) => value?.includes(typedQuery.text ?? ''))
        }

        return true
      })
    },
    async invoke(action, state, io) {
      const actionName = parseActionName(action)

      switch (actionName) {
        case 'moveNext':
          return performKeyAction(io, 'Down')
        case 'movePrev':
          return performKeyAction(io, 'Up')
        case 'openSelected':
          return performKeyAction(io, 'Enter')
        case 'requestDelete':
          return performKeyAction(io, 'd')
        case 'confirmDelete':
          if (!state.confirmOpen) {
            return {
              ok: false,
              error: {
                message: 'Confirmation dialog is not open'
              }
            }
          }

          return performKeyAction(io, 'y')
        case 'cancel':
          return performKeyAction(io, 'Escape')
        default:
          return {
            ok: false,
            error: {
              message: `Unknown deterministic demo action: ${actionName}`
            }
          }
      }
    }
  }
}

export function createDeterministicDemoHostConfig(): DeterministicDemoHostConfig {
  return {
    drivers: [createDeterministicDemoDriver()],
    launchProfiles: {
      'deterministic-demo': createDeterministicDemoLaunchProfile()
    }
  }
}

export function parseDeterministicDemoState(
  snapshot: ScreenSnapshot
): DeterministicDemoState {
  const rows = getVisibleRows(snapshot)
  const mode = parseMode(rows) ?? 'list'
  const itemRows = parseItemRows(rows)
  const items = itemRows.map((row) => cleanItemLabel(row.text))
  const selectedIndex = Math.max(
    0,
    itemRows.findIndex((row) => row.text.startsWith('> '))
  )
  const statusLine = rows.find((row) => row.text.startsWith('Status: '))

  return {
    mode,
    items,
    selectedIndex: items.length === 0 ? -1 : Math.min(selectedIndex, items.length - 1),
    selectedLabel:
      items.length === 0
        ? null
        : items[Math.min(selectedIndex, items.length - 1)] ?? null,
    status: statusLine?.text.slice('Status: '.length) ?? '',
    confirmOpen: mode === 'confirm'
  }
}

function buildElements(state: DeterministicDemoState): Element[] {
  const elements: Element[] = state.items.map((item, index) =>
    createElement({
      id: `item:${item}`,
      role: ITEM_ROLE,
      name: item,
      text: item,
      box: createBox(0, 4 + index, Math.max(4, item.length + 2)),
      actions: ['moveNext', 'movePrev', 'openSelected', 'requestDelete']
    })
  )

  elements.push(
    createElement({
      id: 'status',
      role: STATUS_ROLE,
      text: state.status,
      box: createBox(0, 12, Math.max(8, state.status.length + 8))
    }),
    createElement({
      id: 'hints',
      role: HINTS_ROLE,
      text: 'Up/Down move | Enter open | d delete | Esc cancel | q quit',
      box: createBox(0, 13, 64)
    })
  )

  if (state.mode === 'details') {
    elements.push(
      createElement({
        id: 'details',
        role: DETAILS_ROLE,
        name: state.selectedLabel ?? 'details',
        text: `Details: ${state.selectedLabel ?? 'none'}`,
        box: createBox(0, 9, 30),
        actions: ['requestDelete', 'cancel']
      })
    )
  }

  if (state.confirmOpen) {
    elements.push(
      createElement({
        id: 'confirm',
        role: DIALOG_ROLE,
        name: 'Delete Confirmation',
        text: `Delete ${state.selectedLabel ?? 'item'}? (y/n)`,
        box: createBox(0, 8, 32, 2),
        actions: ['confirmDelete', 'cancel']
      })
    )
  }

  return elements
}

function parseMode(rows: ReturnType<typeof getVisibleRows>): DeterministicDemoMode | null {
  const modeLine = rows.find((row) => row.text.startsWith('Mode: '))

  if (!modeLine) {
    return null
  }

  const mode = modeLine.text.slice('Mode: '.length).trim()

  if (mode === 'list' || mode === 'details' || mode === 'confirm') {
    return mode
  }

  return null
}

function parseItemRows(rows: ReturnType<typeof getVisibleRows>) {
  return rows
    .filter((row) => row.y >= 4 && row.y <= 10)
    .filter((row) => {
      const value = cleanItemLabel(row.text)

      return (
        value.length > 0 &&
        !value.startsWith('Confirm Delete') &&
        !value.startsWith('Delete ') &&
        !value.startsWith('Details:')
      )
    })
}

function cleanItemLabel(value: string): string {
  return value.replace(/^>\s*/, '').replace(/^\s+/, '').trim()
}

function parseActionName(action: unknown): string {
  if (typeof action === 'string') {
    return action
  }

  if (action && typeof action === 'object' && 'name' in action) {
    const name = (action as { name?: unknown }).name

    if (typeof name === 'string' && name.trim().length > 0) {
      return name
    }
  }

  return ''
}

async function performKeyAction(
  io: DriverIO,
  key: string
): Promise<ActionResult> {
  if (key.length === 1 && key !== 'Escape') {
    await io.type(key)
  } else {
    await io.press(key)
  }

  const snapshot = await io.waitForChange()

  return {
    ok: true,
    value: {
      revision: snapshot.revision
    }
  }
}
