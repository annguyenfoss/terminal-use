# Phase 2

## Execution Status

Status: complete on 2026-04-24

Delivered:

- shell-first SDK client in `@project-gateway/sdk`
- one public `Session` surface with `Screen`, `Keyboard`, text locators, waits, and a mouse stub
- in-process and WebSocket transports behind one client contract
- live viewport cache backed by `screen.snapshot` and `screen.patch`
- explicit refresh path for full snapshot and scrollback accuracy
- minimal raw message escape hatch for debugging and gaps
- SDK unit and integration coverage, including reattach and remote transport flows

Prototype notes:

- the SDK is intentionally text-first and shell-first
- scrollback is refresh-backed rather than patch-perfect
- mouse is still a stub in this phase
- semantic driver access is deferred to Phase 3

## Goal

Build the SDK skeleton on top of the working Phase 1 host core.

At the end of this phase, a caller should be able to open a managed shell session through a small TypeScript API, read screen state, send keyboard input, and wait on simple shell-visible conditions without dealing with raw protocol envelopes directly.

## Scope

In scope:

- `packages/sdk` session client
- local and WebSocket transport abstraction
- screen access helpers
- keyboard helpers
- generic locators and waits for shell-grade usage
- generic shell tests against the host

Out of scope:

- semantic app drivers
- recorder UI
- inspector UI
- `nano` parsing
- `htop` parsing
- broad mouse-driven interaction work unless a minimal SDK surface is needed for API shape

Prototype execution note:

- keep the SDK shell-first and minimal
- optimize for a usable prototype, not a final public API
- prefer direct and explicit primitives over large abstractions

## Deliverables

Implement the first useful SDK surface in `packages/sdk`, including:

- `Session`
- `Screen`
- `Keyboard`
- `Locator`
- wait helpers

Transport work should cover:

- in-process client usage against `@project-gateway/host`
- WebSocket client usage against the same protocol

If `Mouse` is added in this phase, keep it skeletal unless generic shell tests actually need it.

## Functional Requirements

### Session API

The SDK must be able to:

- create or attach to a managed session
- stop a session
- request a full snapshot
- receive live screen updates

### Screen API

The SDK must expose:

- current snapshot access
- visible text access
- simple line-oriented lookup helpers

### Keyboard API

The SDK must wrap the existing Phase 1 input messages for:

- text input
- paste
- the supported named-key subset

### Locators And Waits

Keep the first pass intentionally narrow:

- visible text match
- line contains text
- wait until text appears
- wait until text disappears
- timeout and polling controls

## Concrete Acceptance Criteria

Phase 2 is complete when all of the following are true:

1. A caller can start a shell session through the SDK without manually constructing protocol messages.
2. A caller can send text and named keys through the SDK.
3. A caller can read the current snapshot and visible text through the SDK.
4. Generic shell waits pass against a live managed shell.
5. The same SDK surface works with both in-process and WebSocket transports.

## Test Plan

### Unit Tests

- transport adapter behavior
- snapshot-to-screen helper behavior
- locator matching
- wait helper timeout behavior

### Integration Tests

Use a real managed shell and verify:

- session start through the SDK
- prompt detection
- command execution
- visible text queries
- wait helpers
- attach and stop flows

### Transport Tests

- one SDK flow against the in-process transport
- the same SDK flow against the WebSocket transport

## Explicit Non-Goals

Do not start:

- driver-specific parsing
- recorder authoring flows
- inspector UI work
- `nano` or `htop` feature coverage

Those belong to later phases.
