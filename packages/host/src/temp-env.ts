import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

export interface ManagedTempEnvOptions {
  tempRoot?: string
  envOverrides?: Record<string, string | undefined>
  prompt?: string
}

export interface ManagedTempEnv {
  homeDir: string
  env: Record<string, string>
  cleanup(): Promise<void>
}

export async function createManagedTempEnv(
  options: ManagedTempEnvOptions = {}
): Promise<ManagedTempEnv> {
  const root = options.tempRoot ?? tmpdir()
  await mkdir(root, { recursive: true })
  const homeDir = await mkdtemp(join(root, 'project-gateway-home-'))
  const env = buildManagedEnv(homeDir, options)

  return {
    homeDir,
    env,
    async cleanup() {
      await rm(homeDir, { recursive: true, force: true })
    }
  }
}

export function buildManagedEnv(
  homeDir: string,
  options: ManagedTempEnvOptions = {}
): Record<string, string> {
  const env: Record<string, string> = {}

  if (process.env.PATH) {
    env.PATH = process.env.PATH
  }

  env.HOME = homeDir
  env.TERM = 'xterm-256color'
  env.LANG = 'C'
  env.LC_ALL = 'C'
  env.HISTFILE = '/dev/null'
  env.PROMPT_COMMAND = ''

  if (options.prompt) {
    env.PS1 = options.prompt
  }

  for (const [key, value] of Object.entries(options.envOverrides ?? {})) {
    if (value !== undefined) {
      env[key] = value
    }
  }

  return env
}
