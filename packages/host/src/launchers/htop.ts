import type { ManagedLauncherConfig } from './nano.js'

export function createHtopLaunchConfig(
  overrides: Partial<ManagedLauncherConfig> = {}
): ManagedLauncherConfig {
  return {
    command: overrides.command ?? 'htop',
    args: overrides.args ?? [],
    env: overrides.env ?? {}
  }
}
