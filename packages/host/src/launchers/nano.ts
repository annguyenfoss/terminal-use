export interface ManagedLauncherConfig {
  command: string
  args: string[]
  env: Record<string, string>
}

export function createNanoLaunchConfig(
  overrides: Partial<ManagedLauncherConfig> = {}
): ManagedLauncherConfig {
  return {
    command: overrides.command ?? 'nano',
    args: overrides.args ?? ['--ignorercfiles', '--mouse'],
    env: overrides.env ?? {}
  }
}
