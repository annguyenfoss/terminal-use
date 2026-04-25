import { execFile, spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { beforeAll, describe, expect, it } from 'vitest'

import { createHostServer } from '../../../packages/host/src/index.js'
import { createInProcessClient } from '../../../packages/sdk/src/index.js'
import {
  attachHtop,
  createHtopDriver,
  createHtopLaunchProfile
} from '../src/index.js'

const execFileAsync = promisify(execFile)

describe('htop integration', () => {
  let supportedHtop = false

  beforeAll(async () => {
    supportedHtop = await hasSupportedHtop()
  })

  it('launches managed htop, parses the main view, and supports alpha navigation flows', async () => {
    if (!supportedHtop) {
      return
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'project-gateway-htop-'))
    const host = createHostServer({
      tempRoot,
      drivers: [createHtopDriver()],
      launchProfiles: {
        htop: createHtopLaunchProfile()
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@project-gateway/driver-htop:test'
    })

    try {
      const session = await client.startSession({
        profile: 'htop',
        profileArgs: {
          readonly: true
        }
      })
      const htop = await attachHtop(session)

      const initial = await htop.waitForMode('main')
      expect(initial.activeTab).toBe('Main')
      expect(initial.processes.length).toBeGreaterThan(0)

      const startingIndex = initial.selectedIndex
      const moveDirection =
        initial.selectedIndex !== null &&
        initial.processes.length > 1 &&
        initial.selectedIndex >= initial.processes.length - 1
          ? 'up'
          : 'down'

      await htop.moveSelection(moveDirection)
      const moved = await htop.waitForMode('main')
      expect(moved.selectedProcess?.pid).not.toBeNull()
      if (startingIndex !== null && moved.processes.length > 1) {
        expect(moved.selectedIndex).not.toBe(startingIndex)
      }
      const filterToken =
        moved.selectedProcess?.command.split(/\s+/u)[0]?.trim() || 'bwrap'

      await htop.toggleTree()
      expect((await htop.waitForMode('main')).treeView).toBe(true)
      await htop.toggleTree()
      expect((await htop.waitForMode('main')).treeView).toBe(false)

      await htop.sortBy('pid')
      expect((await htop.waitForMode('main')).header?.sort).toBe('pid')

      await htop.search('htop')
      expect((await htop.waitForMode('main')).processes.some((row) => row.command.includes('htop'))).toBe(true)

      await htop.filter(filterToken)
      const filtered = await htop.waitForMode('main')
      if (filtered.processes.length > 0) {
        expect(
          filtered.processes.some((row) =>
            row.command.toLowerCase().includes(filterToken.toLowerCase())
          )
        ).toBe(true)
      }

      await htop.clearFilter()
      expect((await htop.waitForMode('main')).processes.length).toBeGreaterThan(0)

      await htop.refresh()
      await htop.quit()
      await session.waitForExit()
    } finally {
      await client.close()
      await host.close()
    }
  }, 25_000)

  it('kills a disposable child process through the signal menu', async () => {
    if (!supportedHtop) {
      return
    }

    const sleeper = spawn('sleep', ['30'])
    const tempRoot = await mkdtemp(join(tmpdir(), 'project-gateway-htop-'))
    const host = createHostServer({
      tempRoot,
      drivers: [createHtopDriver()],
      launchProfiles: {
        htop: createHtopLaunchProfile()
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@project-gateway/driver-htop:test'
    })

    try {
      const session = await client.startSession({
        profile: 'htop',
        profileArgs: {
          pids: [sleeper.pid!],
          readonly: false
        }
      })
      const htop = await attachHtop(session)

      const state = await htop.waitForMode('main')
      expect(state.processes.some((row) => row.command.includes('sleep 30'))).toBe(
        true
      )

      await htop.killSelected(9)
      await waitForProcessExit(sleeper.pid!)

      await htop.quit()
      await session.waitForExit()
    } finally {
      sleeper.kill('SIGKILL')
      await client.close()
      await host.close()
    }
  }, 25_000)
})

async function hasSupportedHtop(): Promise<boolean> {
  if (process.platform !== 'linux') {
    return false
  }

  try {
    const { stdout, stderr } = await execFileAsync('htop', ['--version'], {
      encoding: 'utf8'
    })
    return /htop\s+3\.5(?:\.[0-9]+)?/u.test(`${stdout ?? ''}\n${stderr ?? ''}`)
  } catch {
    return false
  }
}

async function waitForProcessExit(pid: number): Promise<void> {
  const deadline = Date.now() + 3_000

  while (Date.now() <= deadline) {
    try {
      process.kill(pid, 0)
      await new Promise((resolve) => setTimeout(resolve, 50))
    } catch {
      return
    }
  }

  throw new Error(`Timed out waiting for process exit: ${pid}`)
}
