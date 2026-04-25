import { execFile } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { beforeAll, describe, expect, it } from 'vitest'

import { createHostServer } from '../../../packages/host/src/index.js'
import type { Session } from '../../../packages/sdk/src/index.js'
import { createInProcessClient } from '../../../packages/sdk/src/index.js'
import { attachNano, createNanoDriver, createNanoLaunchProfile } from '../src/index.js'

const execFileAsync = promisify(execFile)

describe('nano integration', () => {
  let supportedNano = false

  beforeAll(async () => {
    supportedNano = await hasSupportedNano()
  })

  it('launches a managed nano file session and supports save, search, and help', async () => {
    if (!supportedNano) {
      return
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'terminal-use-nano-'))
    const file = join(tempRoot, 'phase4-save-target.txt')
    const host = createHostServer({
      tempRoot,
      drivers: [createNanoDriver()],
      launchProfiles: {
        nano: createNanoLaunchProfile()
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@terminal-use/driver-nano:test'
    })

    try {
      await writeFile(file, 'alpha\nbeta\n', 'utf8')

      const session = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file
        }
      })
      const nano = await attachNano(session)

      await waitForNanoText(nano, 'alpha')
      await nano.insert('phase4-')
      await waitForNanoText(nano, 'phase4-alpha')
      await nano.save()
      await waitForFileText(file, 'phase4-alpha')
      await nano.search('beta')
      expect((await nano.waitForMode('editor')).mode).toBe('editor')
      await nano.openHelp()
      expect((await nano.waitForMode('help')).mode).toBe('help')
      await nano.closeHelp()
      expect((await nano.waitForMode('editor')).mode).toBe('editor')

      await session.stop()
      await session.waitForExit()
    } finally {
      await client.close()
      await host.close()
    }
  }, 20_000)

  it('saves a new buffer with saveAs()', async () => {
    if (!supportedNano) {
      return
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'terminal-use-nano-'))
    const file = join(tempRoot, 'phase4-save-as.txt')
    const host = createHostServer({
      tempRoot,
      drivers: [createNanoDriver()],
      launchProfiles: {
        nano: createNanoLaunchProfile()
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@terminal-use/driver-nano:test'
    })

    try {
      const session = await client.startSession({
        profile: 'nano'
      })
      const nano = await attachNano(session)

      await nano.insert('saved-from-save-as\n')
      await nano.saveAs(file)
      await waitForFileText(file, 'saved-from-save-as')

      await session.stop()
      await session.waitForExit()
    } finally {
      await client.close()
      await host.close()
    }
  }, 20_000)

  it('opens a file through the nano browser flow', async () => {
    if (!supportedNano) {
      return
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'terminal-use-nano-'))
    const file = join(
      tempRoot,
      'phase4-browser-target.txt'
    )
    const host = createHostServer({
      tempRoot,
      drivers: [createNanoDriver()],
      launchProfiles: {
        nano: createNanoLaunchProfile({
          cwd: tempRoot
        })
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@terminal-use/driver-nano:test'
    })

    try {
      await writeFile(file, 'opened through browser\n', 'utf8')

      const session = await client.startSession({
        profile: 'nano'
      })
      const nano = await attachNano(session)

      await nano.openFile(file, {
        viaBrowser: true
      })
      await waitForNanoText(nano, 'opened through browser')

      await session.stop()
      await session.waitForExit()
    } finally {
      await client.close()
      await host.close()
    }
  }, 20_000)

  it('replaces one match, replaces all remaining matches, and saves the file', async () => {
    if (!supportedNano) {
      return
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'terminal-use-nano-'))
    const file = join(tempRoot, 'phase5-replace-target.txt')
    const host = createHostServer({
      tempRoot,
      drivers: [createNanoDriver()],
      launchProfiles: {
        nano: createNanoLaunchProfile()
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@terminal-use/driver-nano:test'
    })

    try {
      await writeFile(file, 'alpha\nalpha\n', 'utf8')

      const session = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file
        }
      })
      const nano = await attachNano(session)

      await waitForNanoText(nano, 'alpha')
      await nano.replace('alpha', 'beta')
      await nano.save()
      await waitForFileContents(file, 'beta\nalpha\n')

      await session.stop()
      await session.waitForExit()

      const secondSession = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file
        }
      })
      const secondNano = await attachNano(secondSession)

      await secondNano.replace('alpha', 'gamma', {
        all: true
      })
      await secondNano.save()
      await waitForFileContents(file, 'beta\ngamma\n')

      await secondNano.exit()
      await secondSession.waitForExit()
    } finally {
      await client.close()
      await host.close()
    }
  }, 20_000)

  it('runs execute, speller, formatter, and linter flows', async () => {
    if (!supportedNano) {
      return
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'terminal-use-nano-'))
    const file = join(tempRoot, 'phase5-helper-target.txt')
    const host = createHostServer({
      tempRoot,
      drivers: [createNanoDriver()],
      launchProfiles: {
        nano: createNanoLaunchProfile()
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@terminal-use/driver-nano:test'
    })

    try {
      await writeFile(file, 'alpha\nbeta\n', 'utf8')

      const session = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file
        }
      })
      const nano = await attachNano(session)

      await nano.runSpeller()
      await waitForNanoText(nano, 'omega')
      await nano.runFormatter()
      await waitForNanoText(nano, 'OMEGA')
      await nano.executeCommand("printf 'cmd-output\\n'")
      await waitForNanoText(nano, 'cmd-output')

      await session.stop()
      await session.waitForExit()

      const lintSession = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file
        }
      })
      const lintNano = await attachNano(lintSession)

      await lintNano.runLinter()
      expect((await lintNano.waitForMode('linter')).statusMessage).toBe('lint says hello')
      await lintNano.jumpNextLint()
      await lintNano.jumpPrevLint()
      await lintNano.exit()
      expect((await lintNano.waitForMode('editor')).mode).toBe('editor')

      await lintSession.stop()
      await lintSession.waitForExit()
    } finally {
      await client.close()
      await host.close()
    }
  }, 20_000)

  it('supports multibuffer, marked edits, macros, and anchors', async () => {
    if (!supportedNano) {
      return
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'terminal-use-nano-'))
    const firstFile = join(tempRoot, 'phase5-buffer-one.txt')
    const secondFile = join(tempRoot, 'phase5-buffer-two.txt')
    const host = createHostServer({
      tempRoot,
      drivers: [createNanoDriver()],
      launchProfiles: {
        nano: createNanoLaunchProfile({
          cwd: tempRoot
        })
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@terminal-use/driver-nano:test'
    })

    try {
      await writeFile(firstFile, 'alpha\nbeta\n', 'utf8')
      await writeFile(secondFile, 'delta\n', 'utf8')

      const session = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file: firstFile
        }
      })
      const nano = await attachNano(session)

      await waitForNanoText(nano, 'alpha')
      await nano.toggleMark()
      await pressKey(session, 'Right', 5)
      await nano.copySelection()
      expect(nano.current()?.markActive).toBe(false)
      await nano.paste()
      await waitForNanoTextCount(nano, 'alpha', 2)
      await nano.undo()
      await waitForNanoTextCount(nano, 'alpha', 1)

      await session.stop()
      await session.waitForExit()

      const secondSession = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file: firstFile
        }
      })
      const secondNano = await attachNano(secondSession)

      await waitForNanoText(secondNano, 'alpha')
      await secondNano.toggleMark()
      await pressKey(secondSession, 'Right', 5)
      await secondNano.cutSelection()
      await waitForNanoTextMissing(secondNano, 'alpha')
      await secondNano.paste()
      await waitForNanoText(secondNano, 'alpha')
      await secondNano.undo()
      await waitForNanoTextMissing(secondNano, 'alpha')
      await secondNano.redo()
      await waitForNanoText(secondNano, 'alpha')

      await secondSession.stop()
      await secondSession.waitForExit()

      const thirdSession = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file: firstFile
        }
      })
      const thirdNano = await attachNano(thirdSession)

      await thirdNano.openFile(secondFile, {
        viaBrowser: true
      })
      await waitForNanoText(thirdNano, 'delta')
      expect(thirdNano.current()?.bufferCount).toBe(2)
      expect(thirdNano.current()?.bufferIndex).toBe(2)
      await thirdNano.switchBuffer('prev')
      await waitForNanoText(thirdNano, 'alpha')
      expect(thirdNano.current()?.bufferIndex).toBe(1)

      await thirdNano.recordMacro()
      await thirdNano.insert('macro')
      await thirdNano.recordMacro()
      await thirdNano.playMacro()
      await waitForNanoText(thirdNano, 'macromacro')

      await thirdNano.placeAnchor()
      await waitForNanoAnchorCount(thirdNano, 1)
      await thirdNano.jumpAnchor('next')
      await waitForNanoStatus(thirdNano, 'anchor')

      await thirdSession.stop()
      await thirdSession.waitForExit()
    } finally {
      await client.close()
      await host.close()
    }
  }, 20_000)

  it('exits a modified single-buffer session without saving when requested', async () => {
    if (!supportedNano) {
      return
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'terminal-use-nano-'))
    const file = join(tempRoot, 'phase5-exit-target.txt')
    const host = createHostServer({
      tempRoot,
      drivers: [createNanoDriver()],
      launchProfiles: {
        nano: createNanoLaunchProfile()
      }
    })
    const client = await createInProcessClient(host, {
      clientName: '@terminal-use/driver-nano:test'
    })

    try {
      await writeFile(file, 'alpha\n', 'utf8')

      const session = await client.startSession({
        profile: 'nano',
        profileArgs: {
          file
        }
      })
      const nano = await attachNano(session)

      await nano.insert('unsaved-')
      await nano.exit({
        save: 'no'
      })
      await session.waitForExit()
      await waitForFileContents(file, 'alpha\n')
    } finally {
      await client.close()
      await host.close()
    }
  }, 20_000)
})

async function hasSupportedNano(): Promise<boolean> {
  try {
    const { stdout, stderr } = await execFileAsync('nano', ['--version'], {
      encoding: 'utf8'
    })
    return /version\s+9\.0(\.\d+)?/iu.test(`${stdout ?? ''}\n${stderr ?? ''}`)
  } catch {
    return false
  }
}

async function waitForNanoText(
  nano: Awaited<ReturnType<typeof attachNano>>,
  text: string,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const current = nano.current()

    if (current?.visibleText.some((line) => line.includes(text))) {
      return
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })
  }

  throw new Error(`Timed out waiting for nano text: ${text}`)
}

async function waitForNanoTextCount(
  nano: Awaited<ReturnType<typeof attachNano>>,
  text: string,
  count: number,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const current = nano.current()
    const matches = countOccurrences(current?.visibleText.join('\n') ?? '', text)

    if (matches >= count) {
      return
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for ${count} visible nano text match(es): ${text}`)
}

async function waitForFileText(
  file: string,
  text: string,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const contents = await readFile(file, 'utf8')

      if (contents.includes(text)) {
        return
      }
    } catch {
      // Ignore until the file exists.
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })
  }

  throw new Error(`Timed out waiting for file contents: ${file}`)
}

async function waitForFileContents(
  file: string,
  expected: string,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const contents = await readFile(file, 'utf8')

      if (contents === expected) {
        return
      }
    } catch {
      // Ignore until the file exists.
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for exact file contents: ${file}`)
}

async function waitForNanoTextMissing(
  nano: Awaited<ReturnType<typeof attachNano>>,
  text: string,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const current = nano.current()

    if (!current?.visibleText.some((line) => line.includes(text))) {
      return
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for nano text to disappear: ${text}`)
}

async function waitForNanoAnchorCount(
  nano: Awaited<ReturnType<typeof attachNano>>,
  count: number,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const current = nano.current()

    if ((current?.anchorLines.length ?? 0) >= count) {
      return
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for ${count} visible nano anchor(s)`)
}

async function waitForNanoStatus(
  nano: Awaited<ReturnType<typeof attachNano>>,
  text: string,
  timeoutMs = 5_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const current = nano.current()

    if (current?.statusMessage?.toLowerCase().includes(text.toLowerCase())) {
      return
    }

    await delay(50)
  }

  throw new Error(`Timed out waiting for nano status: ${text}`)
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function pressKey(
  session: Session,
  key: 'Right' | 'Left' | 'Up' | 'Down',
  count: number
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await session.keyboard.press(key)
  }
}

function countOccurrences(value: string, search: string): number {
  if (search.length === 0) {
    return 0
  }

  let count = 0
  let offset = 0

  while (offset <= value.length) {
    const index = value.indexOf(search, offset)

    if (index === -1) {
      return count
    }

    count += 1
    offset = index + search.length
  }

  return count
}
