import { execFile } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { ManagedLaunchProfile } from '@terminal-use/host'

import {
  NANO_DRIVER_ID,
  NANO_SUPPORTED_VERSION,
  type NanoLaunchProfile,
  type NanoLaunchProfileOptions,
  type NanoProfileArgs
} from './types.js'

const execFileAsync = promisify(execFile)

export function createNanoLaunchProfile(
  options: NanoLaunchProfileOptions = {}
): NanoLaunchProfile {
  const command = options.command ?? 'nano'
  let versionPromise: Promise<string> | null = null
  let rcfilePromise: Promise<string> | null = null

  return async ({ profileArgs }) => {
    const version = await (versionPromise ??= probeNanoVersion(command))

    if (!version.startsWith(NANO_SUPPORTED_VERSION)) {
      throw new Error(
        `Unsupported nano version: ${version}. Supported nano version is ${NANO_SUPPORTED_VERSION}.x`
      )
    }

    const args = parseProfileArgs(profileArgs)
    const rcfile = await (rcfilePromise ??= createManagedRcfile())

    return {
      command,
      args: ['--rcfile', rcfile, ...(args.file ? [args.file] : [])],
      cwd: options.cwd,
      rows: options.rows ?? 24,
      cols: options.cols ?? 80,
      driver: NANO_DRIVER_ID
    } satisfies ManagedLaunchProfile
  }
}

async function probeNanoVersion(command: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(command, ['--version'], {
    encoding: 'utf8'
  })
  const output = `${stdout ?? ''}\n${stderr ?? ''}`
  const match = /version\s+([0-9]+(?:\.[0-9]+)+)/iu.exec(output)

  if (!match?.[1]) {
    throw new Error(`Unable to determine nano version from ${command} --version`)
  }

  return match[1]
}

function parseProfileArgs(value: unknown): NanoProfileArgs {
  if (value === undefined) {
    return {}
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('nano launch profileArgs must be an object')
  }

  const { file, ...rest } = value as Record<string, unknown>

  if (Object.keys(rest).length > 0) {
    throw new Error('nano launch profileArgs only support { file?: string }')
  }

  if (file !== undefined && (typeof file !== 'string' || file.trim().length === 0)) {
    throw new Error('nano launch profileArgs.file must be a non-empty string')
  }

  return {
    file
  }
}

async function createManagedRcfile(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'terminal-use-nano-'))
  const rcfile = join(root, 'nanorc')
  const formatter = fileURLToPath(new URL('../runtime/formatter.mjs', import.meta.url))
  const linter = fileURLToPath(new URL('../runtime/linter.mjs', import.meta.url))
  const speller = fileURLToPath(new URL('../runtime/speller.mjs', import.meta.url))
  const lines = [
    'set mouse',
    'set historylog',
    'set linenumbers',
    'set multibuffer',
    'set positionlog',
    'set showcursor',
    'set stateflags',
    'bind M-< prevbuf main',
    'bind M-> nextbuf main',
    "bind M-' anchor main",
    'bind M-P prevanchor main',
    'bind M-N nextanchor main',
    'bind M-S speller main',
    'bind M-F formatter main',
    'bind M-B linter main',
    `set speller "${process.execPath} ${speller}"`,
    'syntax "default"',
    'color white,black "^$^"',
    `formatter ${process.execPath} ${formatter}`,
    `linter ${process.execPath} ${linter}`
  ]

  await writeFile(rcfile, `${lines.join('\n')}\n`, 'utf8')
  return rcfile
}
