# EXECUTION_STATUS

Date: 2026-04-25

## Canonical Plan

The master plan is:

- [PLAN_FINAL.md](/home/stk/workspace/engineering/adjutant/terminal-use/DIRECTIVE/PLAN/PLAN_FINAL.md)

This file is the execution companion to the master plan.

Rules:

- `PLAN_FINAL.md` is the architecture and scope source of truth.
- This file tracks current execution state.
- Phase docs under `DIRECTIVE/PLAN/PHASE/` define the current implementation backlog in smaller actionable chunks.
- If a phase doc conflicts with `PLAN_FINAL.md`, update the phase doc to match the master plan unless the master plan itself has been intentionally revised.

## Current Phase

Current phase: `Phase 7`

Next phase after that: `Phase 8`

## Current Focus

The immediate goal is to expand the shipped `htop` alpha slice into the broader runtime matrix described for Phase 7 in the master plan.

That means:

- keep the completed `nano` 9.0 runtime matrix and `htop` alpha slice stable
- broaden `htop` beyond the main view into setup/help/tree-depth/tags/affinity/side-screen work
- continue using the recorder and inspector as the primary debugging path for premium-driver work
- keep full-coverage work focused on validated Linux-first behavior before broadening the runtime target again

Execution note for the prototype track:

- the host/SDK/tooling stack is now functional enough for real driver work
- Phase 5 completed the supported `nano` 9.0 runtime slice needed before `htop`
- Phase 6 shipped against the validated local `htop 3.5.x` track, verified on `3.5.0`
- `PLAN_FINAL.md` remains unchanged as the longer-range `htop >= 3.4.1 < 4` target

## Done

- Created [PLAN_KODAK.md](/home/stk/workspace/engineering/adjutant/terminal-use/DIRECTIVE/PLAN/ARCHIVE/PLAN_KODAK.md)
- Reviewed [PLAN_COLGATE.md](/home/stk/workspace/engineering/adjutant/terminal-use/DIRECTIVE/PLAN/ARCHIVE/PLAN_COLGATE.md) against current sources
- Created merged master plan [PLAN_FINAL.md](/home/stk/workspace/engineering/adjutant/terminal-use/DIRECTIVE/PLAN/PLAN_FINAL.md)
- Created execution structure docs
- Bootstrapped a pnpm workspace with root build, typecheck, lint, and test commands
- Created package shells for `protocol`, `host`, `sdk`, `driver-kit`, `recorder`, `testing`, `cli`, `driver-nano`, and `driver-htop`
- Implemented the initial `@terminal-use/protocol` package with v1 envelope and Phase 1 message schemas
- Implemented the Phase 1 host core in `@terminal-use/host`
- Added managed PTY sessions, xterm-backed canonical screen state, snapshots, row patches, in-process transport, and standalone WebSocket transport
- Added lean launcher/config stubs for `nano` and `htop`
- Added host unit, integration, and transport tests
- Implemented the Phase 2 SDK skeleton in `@terminal-use/sdk`
- Added `Session`, `Screen`, `Keyboard`, text locators, waits, and a minimal raw escape hatch
- Added in-process and WebSocket SDK transports with one client contract
- Added SDK unit and integration tests, including reattach and remote transport coverage
- Aligned protocol `session.start` with default-shell launches by making `command` optional
- Verified local `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `pnpm test`
- Implemented Phase 3 protocol shapes for semantic events, query/action results, launch profiles, and recorder lifecycle messages
- Implemented the first real `packages/driver-kit` contract and helper primitives
- Added the deterministic demo app and toy driver in `packages/testing`
- Added host driver runtime, semantic state storage, launch profiles, and recorder integration
- Added SDK driver clients for semantic state waits, query, and action invoke
- Added the `apps/inspector-web` Vite inspector alpha with xterm rendering, semantic pane, raw event pane, action buttons, and recording controls
- Added thin Phase 3 CLI wrappers for `host-demo` and `record-demo`
- Added Phase 3 integration tests for host semantic state, recording bundles, and SDK driver actions
- Implemented resolver-backed managed launch profiles and generic `profileArgs` support in the protocol, host, and SDK
- Implemented the first real `@terminal-use/driver-nano` package with a version-guarded managed launch profile for GNU `nano` 9.0
- Added `nano` parser slices for editor, search, write-out, read-file, help, browser, and yes/no flows
- Added a thin typed `attachNano(session)` facade for `insert`, `save`, `saveAs`, `search`, `openHelp`, `closeHelp`, and `openFile`
- Added `nano` parser fixtures, launch tests, and live integration tests for managed launch, save/saveAs, search/help, and browser-backed file open
- Extended the inspector to start `deterministic-demo` or `nano` sessions and invoke free-form driver actions
- Added `terminal-use host-nano` and `terminal-use record-nano`
- Hardened the host against late PTY output after session teardown by making session broadcast tolerant of removed sessions
- Added a deterministic managed `nanorc` with helper scripts and fallback bindings for `nano` 9.0
- Expanded the `nano` parser and typed facade for replace, marked editing, execute/helper flows, multibuffer, macros, anchors, and exit handling
- Added broader `nano` parser fixtures and live integration coverage for replace, helper flows, multibuffer, marked edits, macros, anchors, and exit behavior
- Expanded inspector quick actions so the widened `nano` surface is debuggable live
- Verified local `pnpm build`, `pnpm typecheck`, `pnpm lint`, and full `pnpm test`, including WebSocket transport coverage
- Implemented the first real `@terminal-use/driver-htop` package with a managed `htop` launch profile, deterministic `HTOPRC`, and a GNU/Linux-first `htop 3.5.x` version guard
- Added `htop` parser coverage for the managed main view, tabs, meters, search/filter prompts, function bar, and signal menu
- Added a thin typed `attachHtop(session)` facade for navigation, tree toggle, search/filter, sort presets, kill signal flow, refresh, and quit
- Added `htop` parser fixtures, launch tests, and live integration tests for managed launch, navigation, search/filter, sort, tree toggle, and signal-menu kill
- Added `terminal-use host-htop` and `terminal-use record-htop`
- Extended the inspector to launch `htop` with optional PID filtering and readonly-by-default controls
- Verified the isolated Phase 6 `htop` package path locally with parser, launch, and live integration coverage

## In Progress

- none

## Blocked

- none

## Next Concrete Tasks

1. Create workspace root files:
   - done
2. Create package directories and shells:
   - done
3. Keep the initial protocol package intentionally narrow:
   - done
4. Create the Phase 2 SDK backlog doc:
   - done
5. Implement a transport-agnostic `Session` client in `packages/sdk`:
   - done
6. Add generic shell `Screen`, `Keyboard`, `Locator`, and wait helpers:
   - done
7. Add generic SDK shell tests against the live host:
   - done
8. Create the Phase 3 driver-kit/recorder backlog doc:
   - done
9. Implement the initial driver contract and driver-kit primitives:
   - done
10. Add recorder and inspector plumbing for toy-driver debugging:
   - done
11. Start the `nano` alpha backlog:
   - done
12. Start the `nano` full-coverage backlog:
   - done
13. Create the Phase 6 `htop` alpha backlog doc:
   - done
14. Start the `htop` alpha backlog:
   - done
15. Create the Phase 7 `htop` full-coverage backlog doc:
   - done
16. Start the `htop` full-coverage backlog:
   - next

## Acceptance Gate For Leaving Phase 7

Phase 7 is done when:

- the broader `htop` screen family is supported beyond the alpha main-view slice
- capability downgrades for unsupported helper screens and privileged operations are explicit
- the `htop` supported-runtime matrix is green on the validated prototype track
- the inspector and recorder remain sufficient to debug the expanded `htop` surface live
- local build, typecheck, lint, and test are green

Prototype note:

- the `htop` support target remains on the validated local `3.5.x` track while full coverage is built out
- the completed `nano` target remains GNU `nano` 9.0 first for the prototype track
- full transport verification still uses a real localhost bind during tests

## Notes

- Keep docs small and execution-oriented.
- Avoid copying large sections from `PLAN_FINAL.md`.
- Update this file whenever the current phase changes or meaningful implementation progress happens.
