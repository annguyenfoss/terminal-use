# Phase 1

## Execution Status

Status: complete on 2026-04-24

Delivered:

- managed PTY lifecycle via `node-pty`
- canonical terminal state via `@xterm/headless`
- full screen snapshots and dirty-row patches
- in-process transport
- standalone WebSocket transport
- in-memory reattach within one host process
- shell-first integration coverage
- lean launcher/config stubs for `nano` and `htop`

Prototype notes:

- reattach is intentionally in-memory only
- the named-key subset is intentionally small in this phase
- `nano` and `htop` launchers do not include app-specific runtime logic yet
- recorder and replay modules are plumbing stubs only in this phase

## Goal

Build the host core for managed shell sessions.

At the end of this phase, the system should be able to start a shell, own the PTY, ingest terminal output into canonical screen state, and expose that state through both in-process and WebSocket paths.

This is the first real product phase.

## Scope

In scope:

- PTY lifecycle
- headless terminal binding
- snapshot extraction
- dirty-row patch generation
- session registry
- in-process transport
- WebSocket transport
- shell smoke tests

Out of scope:

- generic locator engine
- recorder UI or replay tooling beyond plumbing
- inspector UI
- `nano` or `htop` premium drivers
- advanced auth/multi-user concerns

## Deliverables

### `packages/host` Initial Modules

Implement:

- `server.ts`
- `session-manager.ts`
- `session-registry.ts`
- `pty-session.ts`
- `terminal-state.ts`
- `snapshot-builder.ts`
- `patch-builder.ts`
- `driver-runtime.ts`
- `driver-state-store.ts`
- `recording-store.ts`
- `replay.ts`
- `temp-env.ts`
- `transports/in-process.ts`
- `transports/ws-server.ts`

### Minimal Launchers

Create launchers for managed app entry points, but only shell behavior needs to work in Phase 1:

- `launchers/nano.ts`
- `launchers/htop.ts`

These can initially define config contracts without full app-specific logic.

### Protocol Integration

The host must correctly support:

- `hello`
- `session.start`
- `session.attach`
- `session.stop`
- `session.resize`
- `input.key`
- `input.text`
- `input.paste`
- `screen.get`

The full query/action system can remain skeletal if the transport wiring is correct.

## Functional Requirements

### PTY Ownership

The host must:

- spawn a PTY via `node-pty`
- write input to it
- resize it
- observe exit
- close it cleanly

### Headless Terminal State

The host must:

- feed PTY bytes into `@xterm/headless`
- keep canonical revisioned screen state
- expose a full snapshot
- produce dirty-row patches after changes

### Transport

Support:

- in-process transport for direct SDK usage
- WebSocket transport for remote-capable usage

The same session model should back both.

### Session Registry

Track:

- session IDs
- active PTY metadata
- current revision
- exit state

## Concrete Acceptance Criteria

Phase 1 is complete when all of the following are true:

1. A shell session can be started programmatically.
2. Text typed through the host reaches the shell.
3. PTY output is reflected in canonical screen state.
4. A full screen snapshot can be requested after shell output changes.
5. Dirty-row patches are emitted after screen mutations.
6. A client can connect through WebSocket and receive the same session state model.
7. Session stop and process exit are handled cleanly.

## Test Plan

### Unit Tests

- snapshot builder
- patch builder
- session registry
- temp env creation

### Integration Tests

Spawn a real shell and verify:

- prompt appears
- typed command runs
- output appears in snapshot
- resize changes rows/cols
- session exit is surfaced correctly

### Transport Tests

- in-process transport round-trip
- WebSocket transport round-trip

## Recommended Order

1. `pty-session.ts`
2. `terminal-state.ts`
3. `snapshot-builder.ts`
4. `patch-builder.ts`
5. `session-manager.ts`
6. `session-registry.ts`
7. `transports/in-process.ts`
8. `transports/ws-server.ts`
9. integration tests

## Explicit Non-Goals

Do not start:

- locator heuristics
- semantic driver parsing
- `nano` feature work
- `htop` feature work
- inspector UI

Those belong to later phases.

## Exit Notes

Do not proceed to premium app work until the host core is stable enough to debug terminal behavior reliably. If snapshots or patches are not trustworthy yet, stop and fix that first.
