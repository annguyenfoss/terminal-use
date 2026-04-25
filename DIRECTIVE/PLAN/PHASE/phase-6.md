# Phase 6

## Goal

Start the `htop` alpha slice on top of the now-complete `nano` runtime matrix.

At the end of this phase, the repo should have the first real managed `htop` driver path for the core navigation and process-action flows called out in the master plan.

## Scope

Prototype execution note:

- Phase 6 was implemented against the validated local `htop 3.5.x` track and verified on `3.5.0`
- `PLAN_FINAL.md` remains unchanged as the longer-range `htop >= 3.4.1 < 4` target

In scope:

- a deterministic managed `htop` launch profile and `htoprc`
- parser coverage for the main process list view
- stable semantic state for the visible process table and current selection
- search/filter flows
- sort flows
- kill-signal flow
- initial fixtures and live integration tests

Out of scope:

- deeper `htop` setup and side screens
- tree operations, tags, affinity, and other full-coverage work
- release hardening not required for the alpha `htop` path

## Deliverables

Implement:

- the first real `@project-gateway/driver-htop` parser and action surface
- a managed `htop` profile with deterministic config for the supported alpha path
- fixtures for stable parser coverage
- integration tests for the supported `htop` alpha flows

## Concrete Acceptance Criteria

Phase 6 is complete when all of the following are true:

1. A managed `htop` session launches deterministically through the host.
2. The parser identifies the main process table and selected row reliably enough for real tests.
3. Search/filter, sort, and kill-signal flows are testable through the driver path.
4. The inspector and recorder remain sufficient to debug the implemented `htop` slice live.

## Completion Notes

Phase 6 implementation delivered:

- `@project-gateway/driver-htop` with a deterministic managed launch profile and checked-in managed `HTOPRC`
- parser coverage for tabs, meters, main rows, search/filter prompts, function bar, and signal menu
- typed `attachHtop(session)` facade methods for navigation, tree toggle, search/filter, sort presets, kill, refresh, and quit
- CLI and inspector launch/debug support with readonly-by-default `htop` flows
- parser fixtures, launch tests, and live integration tests on the local `htop 3.5.x` runtime

## Explicit Non-Goals

Do not start:

- `htop` full-coverage work
- release hardening not required for the alpha `htop` matrix

Those belong to later phases.
