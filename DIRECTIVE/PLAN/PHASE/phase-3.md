# Phase 3

Status: complete on 2026-04-24.

## Goal

Build the first driver-facing tooling on top of the working host and SDK layers.

At the end of this phase, the repo should have a real driver contract, enough shared parsing and fixture helpers to support a toy driver, and enough recorder/inspector plumbing to debug that driver live.

## Scope

In scope:

- `packages/driver-kit` first useful utilities
- initial driver contract
- semantic event channel wiring only where needed by the toy driver
- recorder plumbing
- inspector plumbing
- one toy-driver workflow that can be debugged end to end

Out of scope:

- full `nano` feature work
- full `htop` feature work
- broad semantic parsing coverage
- polished recorder or inspector product UX

Prototype execution note:

- optimize for driver iteration speed, not completeness
- build only the utilities the first real driver immediately needs
- keep recorder and inspector work narrow and directly tied to debugging value

## Deliverables

Implement:

- initial driver contract and runtime hooks
- first `driver-kit` primitives for text and region-level parsing
- a fixture/debug loop that helps validate a toy driver quickly
- recorder and inspector plumbing sufficient to inspect a live session and semantic state

Implemented:

- concrete Phase 3 protocol shapes for semantic events, query/action, launch profiles, and recorder lifecycle
- host driver runtime, semantic state store, launch profiles, and recorder integration
- deterministic demo app plus toy driver in `packages/testing`
- SDK driver client for semantic state waits, query, and action invoke
- `apps/inspector-web` alpha and thin CLI wrappers for demo host/record flows
- host and SDK Phase 3 integration tests

## Concrete Acceptance Criteria

Phase 3 is complete when all of the following are true:

1. A toy driver can subscribe to host state and produce semantic output.
2. Shared driver-kit helpers exist for the toy driver instead of duplicating parsing logic inline.
3. The toy driver can be debugged live through the recorder/inspector plumbing.
4. The resulting stack is good enough to start `nano` alpha work without inventing new core abstractions.

## Explicit Non-Goals

Do not start:

- full premium-driver feature coverage
- broad app-agnostic semantic modeling
- recorder authoring systems beyond what the toy driver needs

Those belong to later phases.
