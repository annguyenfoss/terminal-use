import { execFile } from 'node:child_process'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import type { ManagedLaunchProfile } from '@project-gateway/host'

import {
  HTOP_DRIVER_ID,
  HTOP_SUPPORTED_VERSION,
  type HtopLaunchProfile,
  type HtopLaunchProfileOptions,
  type HtopProfileArgs
} from './types.js'

const execFileAsync = promisify(execFile)

export function createHtopLaunchProfile(
  options: HtopLaunchProfileOptions = {}
): HtopLaunchProfile {
  const command = options.command ?? 'htop'
  let versionPromise: Promise<string> | null = null
  let rcfilePromise: Promise<string> | null = null

  return async ({ profileArgs }) => {
    const version = await (versionPromise ??= probeHtopVersion(command))

    if (!isSupportedVersion(version)) {
      throw new Error(
        `Unsupported htop version: ${version}. Supported htop version is ${HTOP_SUPPORTED_VERSION}.x in Phase 6`
      )
    }

    const args = parseProfileArgs(profileArgs)
    const rcfile = await (rcfilePromise ??= createManagedHtoprc())

    return {
      command,
      args: [
        ...(args.readonly ? ['--readonly'] : []),
        ...(args.pids && args.pids.length > 0 ? ['-p', args.pids.join(',')] : [])
      ],
      cwd: options.cwd,
      env: {
        HTOPRC: rcfile
      },
      rows: options.rows ?? 45,
      cols: options.cols ?? 140,
      driver: HTOP_DRIVER_ID
    } satisfies ManagedLaunchProfile
  }
}

async function probeHtopVersion(command: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(command, ['--version'], {
    encoding: 'utf8'
  })
  const output = `${stdout ?? ''}\n${stderr ?? ''}`
  const match = /htop\s+([0-9]+(?:\.[0-9]+)+)/iu.exec(output)

  if (!match?.[1]) {
    throw new Error(`Unable to determine htop version from ${command} --version`)
  }

  return match[1]
}

function isSupportedVersion(version: string): boolean {
  return version === HTOP_SUPPORTED_VERSION || version.startsWith(`${HTOP_SUPPORTED_VERSION}.`)
}

function parseProfileArgs(value: unknown): HtopProfileArgs {
  if (value === undefined) {
    return {}
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('htop launch profileArgs must be an object')
  }

  const { pids, readonly, ...rest } = value as Record<string, unknown>

  if (Object.keys(rest).length > 0) {
    throw new Error('htop launch profileArgs only support { pids?: number[]; readonly?: boolean }')
  }

  if (readonly !== undefined && typeof readonly !== 'boolean') {
    throw new Error('htop launch profileArgs.readonly must be a boolean')
  }

  if (
    pids !== undefined &&
    (!Array.isArray(pids) ||
      pids.length === 0 ||
      pids.some((pid) => !Number.isInteger(pid) || Number(pid) <= 0))
  ) {
    throw new Error('htop launch profileArgs.pids must be a non-empty array of positive integers')
  }

  return {
    pids: pids?.map((pid) => Number(pid)),
    readonly
  }
}

async function createManagedHtoprc(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'project-gateway-htop-'))
  const rcfile = join(root, 'htoprc')
  const templatePath = fileURLToPath(new URL('../runtime/managed-htoprc', import.meta.url))
  const template = await readFile(templatePath, 'utf8')

  await writeFile(rcfile, template, 'utf8')
  return rcfile
}
