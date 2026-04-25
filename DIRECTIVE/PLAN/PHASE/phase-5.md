# Phase 5

## Goal

Expand the `nano` driver from the Phase 4 alpha slice into the broader feature and prompt matrix required by the master plan.

At the end of this phase, the repo should move from basic editor/help/browser coverage toward the supported `nano` runtime matrix needed before `htop` work starts.

## Scope

In scope:

- advanced `nano` prompt handling
- replace flows
- mark, cut, copy, paste, undo, and redo flows
- multibuffer support
- write-out, read-file, and browser-backed file flows
- execute-command, spell, formatter, and linter flows where available
- macros and anchors
- managed profile fallbacks for terminal-sensitive helper and navigation chords
- explicit unavailable-flow errors when helper or mode prerequisites are missing
- additional fixtures and runtime-matrix tests

Out of scope:

- `htop` work
- release hardening beyond what the `nano` matrix needs

## Deliverables

Implement:

- a deterministic managed `nanorc` for the supported `nano` 9.0 path
- broader `nano` mode and prompt coverage
- the next typed action surface for advanced `nano` flows
- capability downgrades where features or helpers are unavailable
- expanded fixtures and integration coverage

## Concrete Acceptance Criteria

Phase 5 is complete when all of the following are true:

1. The supported `nano` runtime matrix is green for the Phase 5 feature slice.
2. Replace, mark/cut/copy/paste, multibuffer, and configured helper-tool flows are testable through the driver path.
3. Managed helper flows and long prompt inputs behave deterministically enough for real integration tests.
4. Capability reporting and downgrades are explicit enough to keep unsupported flows from failing ambiguously.
5. The recorder and inspector remain sufficient to debug the widened `nano` surface.

## Explicit Non-Goals

Do not start:

- `htop` alpha work
- release hardening not required for the `nano` matrix

Those belong to later phases.
