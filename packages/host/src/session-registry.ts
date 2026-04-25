import type { PtySession } from './pty-session.js'
import type { ManagedTempEnv } from './temp-env.js'
import type { TerminalState } from './terminal-state.js'

export interface SessionRecord {
  id: string
  profile?: string
  command: string
  args: string[]
  cwd?: string
  driver?: string
  pty: PtySession
  terminalState: TerminalState
  tempEnv: ManagedTempEnv
  subscribers: Set<string>
  startedAt: number
  exit: { exitCode: number; signal: string | null } | null
}

export class SessionRegistry {
  private readonly sessions = new Map<string, SessionRecord>()

  create(record: SessionRecord): SessionRecord {
    this.sessions.set(record.id, record)
    return record
  }

  get(sessionId: string): SessionRecord | undefined {
    return this.sessions.get(sessionId)
  }

  require(sessionId: string): SessionRecord {
    const session = this.get(sessionId)

    if (!session) {
      throw new Error(`Unknown session: ${sessionId}`)
    }

    return session
  }

  all(): SessionRecord[] {
    return [...this.sessions.values()]
  }

  attach(sessionId: string, connectionId: string): SessionRecord {
    const session = this.require(sessionId)
    session.subscribers.add(connectionId)
    return session
  }

  detachConnection(connectionId: string): void {
    for (const session of this.sessions.values()) {
      session.subscribers.delete(connectionId)
    }
  }

  markExited(
    sessionId: string,
    exit: { exitCode: number; signal: string | null }
  ): SessionRecord {
    const session = this.require(sessionId)
    session.exit = exit
    return session
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }
}
