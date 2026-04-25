#!/usr/bin/env node

import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  HTOP_LAUNCH_PROFILE,
  attachHtop,
  createHtopDriver,
  createHtopLaunchProfile
} from '@project-gateway/driver-htop'
import {
  NANO_LAUNCH_PROFILE,
  attachNano,
  createNanoDriver,
  createNanoLaunchProfile
} from '@project-gateway/driver-nano'
import { createHostServer } from '@project-gateway/host'
import { PROTOCOL_VERSION, type HostToClientMessage } from '@project-gateway/protocol'
import { createInProcessClient } from '@project-gateway/sdk'
import {
  DETERMINISTIC_DEMO_DRIVER_ID,
  createDeterministicDemoHostConfig
} from '@project-gateway/testing'

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const [command, ...rest] = argv

  if (command === 'host-demo') {
    await runHostDemo(rest)
    return
  }

  if (command === 'record-demo') {
    await runRecordDemo(rest)
    return
  }

  if (command === 'host-nano') {
    await runHostNano(rest)
    return
  }

  if (command === 'record-nano') {
    await runRecordNano(rest)
    return
  }

  if (command === 'host-htop') {
    await runHostHtop(rest)
    return
  }

  if (command === 'record-htop') {
    await runRecordHtop(rest)
    return
  }

  printUsage()
  process.exitCode = 1
}

async function runHostDemo(argv: string[]): Promise<void> {
  const port = readNumberFlag(argv, '--port')
  const host = createHostServer({
    ...createDeterministicDemoHostConfig(),
    ws: {
      host: '127.0.0.1',
      port: port ?? 0,
      path: '/ws'
    }
  })

  try {
    const server = await host.startWebSocketServer()
    const address = server.address()
    process.stdout.write(
      `host-demo ready on ws://${address.address}:${address.port}${hostAddressPath(server)}\n`
    )
    process.stdout.write('Press Ctrl+C to stop.\n')

    await Promise.race([once(process, 'SIGINT'), once(process, 'SIGTERM')])
  } finally {
    await host.close()
  }
}

async function runRecordDemo(argv: string[]): Promise<void> {
  const outputDir = readStringFlag(argv, '--out')
  const host = createHostServer(createDeterministicDemoHostConfig())
  const client = await createInProcessClient(host, {
    clientName: '@project-gateway/cli'
  })

  try {
    const session = await client.startSession({
      profile: 'deterministic-demo'
    })
    const driver = session.driver(DETERMINISTIC_DEMO_DRIVER_ID)

    await driver.waitForState((state) => state.elements.length > 0)

    const started = await waitForResponse(
      client,
      session.id,
      'recording.started',
      async (requestId) => {
        await client.raw.send({
          v: PROTOCOL_VERSION,
          id: requestId,
          sessionId: session.id,
          type: 'recording.start',
          payload: {
            format: 'asciicast-bundle',
            outputDir,
            captureInput: false
          }
        })
      }
    )

    await driver.invoke('moveNext')
    await driver.invoke('openSelected')
    await driver.invoke('requestDelete')
    await driver.invoke('cancel')

    const stopped = await waitForResponse(
      client,
      session.id,
      'recording.stopped',
      async (requestId) => {
        await client.raw.send({
          v: PROTOCOL_VERSION,
          id: requestId,
          sessionId: session.id,
          type: 'recording.stop',
          payload: {}
        })
      }
    )

    process.stdout.write(`recording started: ${started.payload.outputDir}\n`)
    process.stdout.write(`recording stopped: ${stopped.payload.outputDir}\n`)

    await session.stop()
    await session.waitForExit()
  } finally {
    await client.close()
    await host.close()
  }
}

async function runHostNano(argv: string[]): Promise<void> {
  const port = readNumberFlag(argv, '--port')
  const host = createHostServer({
    drivers: [createNanoDriver()],
    launchProfiles: {
      [NANO_LAUNCH_PROFILE]: createNanoLaunchProfile()
    },
    ws: {
      host: '127.0.0.1',
      port: port ?? 0,
      path: '/ws'
    }
  })

  try {
    const server = await host.startWebSocketServer()
    const address = server.address()
    process.stdout.write(
      `host-nano ready on ws://${address.address}:${address.port}${hostAddressPath(server)}\n`
    )
    process.stdout.write('Press Ctrl+C to stop.\n')

    await Promise.race([once(process, 'SIGINT'), once(process, 'SIGTERM')])
  } finally {
    await host.close()
  }
}

async function runRecordNano(argv: string[]): Promise<void> {
  const outputDir = readStringFlag(argv, '--out')
  const requestedFile = readStringFlag(argv, '--file')
  const tempRoot = await mkdtemp(join(tmpdir(), 'project-gateway-cli-nano-'))
  const file = requestedFile ?? join(tempRoot, 'recorded-phase4-nano.txt')
  const host = createHostServer({
    tempRoot,
    drivers: [createNanoDriver()],
    launchProfiles: {
      [NANO_LAUNCH_PROFILE]: createNanoLaunchProfile()
    }
  })
  const client = await createInProcessClient(host, {
    clientName: '@project-gateway/cli'
  })

  try {
    const session = await client.startSession({
      profile: NANO_LAUNCH_PROFILE,
      profileArgs: {
        file
      }
    })
    const nano = await attachNano(session)

    await nano.waitForMode('editor')

    const started = await waitForResponse(
      client,
      session.id,
      'recording.started',
      async (requestId) => {
        await client.raw.send({
          v: PROTOCOL_VERSION,
          id: requestId,
          sessionId: session.id,
          type: 'recording.start',
          payload: {
            format: 'asciicast-bundle',
            outputDir,
            captureInput: false
          }
        })
      }
    )

    await nano.insert('phase 4 nano cli recording\n')
    await nano.save()
    await nano.search('phase 4')
    await nano.openHelp()
    await nano.closeHelp()

    const stopped = await waitForResponse(
      client,
      session.id,
      'recording.stopped',
      async (requestId) => {
        await client.raw.send({
          v: PROTOCOL_VERSION,
          id: requestId,
          sessionId: session.id,
          type: 'recording.stop',
          payload: {}
        })
      }
    )

    process.stdout.write(`recording started: ${started.payload.outputDir}\n`)
    process.stdout.write(`recording stopped: ${stopped.payload.outputDir}\n`)
    process.stdout.write(`nano file: ${file}\n`)

    await session.stop()
    await session.waitForExit()
  } finally {
    await client.close()
    await host.close()
  }
}

async function runHostHtop(argv: string[]): Promise<void> {
  const port = readNumberFlag(argv, '--port')
  const host = createHostServer({
    drivers: [createHtopDriver()],
    launchProfiles: {
      [HTOP_LAUNCH_PROFILE]: createHtopLaunchProfile()
    },
    ws: {
      host: '127.0.0.1',
      port: port ?? 0,
      path: '/ws'
    }
  })

  try {
    const server = await host.startWebSocketServer()
    const address = server.address()
    process.stdout.write(
      `host-htop ready on ws://${address.address}:${address.port}${hostAddressPath(server)}\n`
    )
    process.stdout.write('Press Ctrl+C to stop.\n')

    await Promise.race([once(process, 'SIGINT'), once(process, 'SIGTERM')])
  } finally {
    await host.close()
  }
}

async function runRecordHtop(argv: string[]): Promise<void> {
  const outputDir = readStringFlag(argv, '--out')
  const pids = readNumberFlags(argv, '--pid')
  const readwrite = hasFlag(argv, '--readwrite')
  const tempRoot = await mkdtemp(join(tmpdir(), 'project-gateway-cli-htop-'))
  const host = createHostServer({
    tempRoot,
    drivers: [createHtopDriver()],
    launchProfiles: {
      [HTOP_LAUNCH_PROFILE]: createHtopLaunchProfile()
    }
  })
  const client = await createInProcessClient(host, {
    clientName: '@project-gateway/cli'
  })

  try {
    const session = await client.startSession({
      profile: HTOP_LAUNCH_PROFILE,
      profileArgs: {
        readonly: !readwrite,
        ...(pids.length > 0 ? { pids } : {})
      }
    })
    const htop = await attachHtop(session)
    const initial = await htop.waitForMode('main')
    const marker =
      initial.selectedProcess?.command.split(/\s+/u)[0]?.trim() || 'htop'

    const started = await waitForResponse(
      client,
      session.id,
      'recording.started',
      async (requestId) => {
        await client.raw.send({
          v: PROTOCOL_VERSION,
          id: requestId,
          sessionId: session.id,
          type: 'recording.start',
          payload: {
            format: 'asciicast-bundle',
            outputDir,
            captureInput: false
          }
        })
      }
    )

    await htop.sortBy('pid')
    await htop.search(marker)
    await htop.filter(marker)
    await htop.clearFilter()
    await htop.toggleTree()
    await htop.refresh()

    const stopped = await waitForResponse(
      client,
      session.id,
      'recording.stopped',
      async (requestId) => {
        await client.raw.send({
          v: PROTOCOL_VERSION,
          id: requestId,
          sessionId: session.id,
          type: 'recording.stop',
          payload: {}
        })
      }
    )

    process.stdout.write(`recording started: ${started.payload.outputDir}\n`)
    process.stdout.write(`recording stopped: ${stopped.payload.outputDir}\n`)
    process.stdout.write(`readonly: ${readwrite ? 'no' : 'yes'}\n`)

    await htop.quit()
    await session.waitForExit()
  } finally {
    await client.close()
    await host.close()
  }
}

async function waitForResponse<TType extends HostToClientMessage['type']>(
  client: Awaited<ReturnType<typeof createInProcessClient>>,
  sessionId: string,
  type: TType,
  send: (requestId: string) => Promise<void>
): Promise<Extract<HostToClientMessage, { type: TType }>> {
  const requestId = randomUUID()

  return new Promise<Extract<HostToClientMessage, { type: TType }>>(
    (resolve, reject) => {
    const unsubscribe = client.raw.onMessage((message) => {
      if (
        message.type === type &&
        message.id === requestId &&
        message.sessionId === sessionId
      ) {
        unsubscribe()
        resolve(message as Extract<HostToClientMessage, { type: TType }>)
      }

      if (message.type === 'error' && message.id === requestId) {
        unsubscribe()
        reject(new Error(message.payload.message))
      }
    })

    void send(requestId).catch((error) => {
      unsubscribe()
      reject(error)
    })
    }
  )
}

function readNumberFlag(argv: string[], flag: string): number | undefined {
  const value = readStringFlag(argv, flag)

  if (!value) {
    return undefined
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readNumberFlags(argv: string[], flag: string): number[] {
  const values: number[] = []

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== flag) {
      continue
    }

    const parsed = Number.parseInt(argv[index + 1] ?? '', 10)

    if (Number.isFinite(parsed)) {
      values.push(parsed)
    }
  }

  return values
}

function readStringFlag(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag)

  if (index === -1) {
    return undefined
  }

  return argv[index + 1]
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag)
}

function hostAddressPath(server: { options: { path: string } }): string {
  return server.options.path
}

function printUsage(): void {
  process.stdout.write(
    [
      'Usage:',
      '  project-gateway host-demo [--port <port>]',
      '  project-gateway record-demo [--out <directory>]',
      '  project-gateway host-nano [--port <port>]',
      '  project-gateway record-nano [--out <directory>] [--file <path>]',
      '  project-gateway host-htop [--port <port>]',
      '  project-gateway record-htop [--out <directory>] [--pid <pid>] [--readwrite]'
    ].join('\n') + '\n'
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main()
}
