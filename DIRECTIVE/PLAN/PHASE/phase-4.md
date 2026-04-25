# Phase 4

## Goal

Start `nano` alpha work on top of the functional host, SDK, driver-kit, recorder, and inspector stack delivered in Phase 3.

At the end of this phase, the repo should have a deterministic managed `nano` launch profile, the first parser slices for mode/layout awareness, and the first testable editor flows.

## Scope

In scope:

- managed `nano` launch profile
- first `nano` mode and layout parsing
- first editable text flows
- fixtures and tests for the initial alpha path
- use of the existing inspector/recorder loop for `nano` debugging

Out of scope:

- broad `nano` feature coverage
- `htop` work
- release hardening

## Deliverables

Implement:

- `nano` launch defaults for deterministic managed sessions
- first semantic model slices for `nano`
- initial actions for core editor flows
- alpha fixtures and integration tests

Implemented in this phase:

- generic `profileArgs` support plus resolver-backed managed launch profiles
- a GNU `nano` 9.0 managed launch profile with deterministic defaults
- `@project-gateway/driver-nano` parser, actions, and thin typed facade
- alpha mode coverage for editor, search, write-out, read-file, help, browser, and yes/no flows
- nano parser fixtures and live integration tests
- inspector and CLI support for live `nano` sessions

## Concrete Acceptance Criteria

Phase 4 is complete when all of the following are true:

1. A managed `nano` session launches deterministically through the host.
2. The first `nano` parser can identify core visible modes/layout regions reliably enough for tests.
3. At least one real editor flow is driven through the SDK/driver path.
4. The Phase 3 inspector and recorder are sufficient to debug the implemented `nano` path.

Status:

- complete on 2026-04-25

## Explicit Non-Goals

Do not start:

- full `nano` parity
- `htop` alpha work
- broad cross-app semantic modeling

Those belong to later phases.
