# Phase 7

## Goal

Expand the shipped `htop` alpha slice into the broader supported runtime matrix described in the master plan.

At the end of this phase, the repo should have full-coverage `htop` support for the next screen family beyond the alpha main-view slice, while staying on the validated local `3.5.x` prototype track.

## Scope

Prototype execution note:

- keep `PLAN_FINAL.md` unchanged as the longer-range `htop >= 3.4.1 < 4` target
- continue implementation and verification on the validated local `htop 3.5.x` track until the broader matrix is ready to backfill

In scope:

- setup/help flows
- deeper tree operations beyond the alpha toggle
- tags and multi-selection flows
- affinity and related side actions where supported
- side screens and helper-backed views with explicit capability handling
- broader fixtures and live integration coverage for the supported `htop` matrix

Out of scope:

- release hardening that belongs to Phase 8
- Windows support
- arbitrary existing terminal attach outside the managed-session model

## Deliverables

Implement:

- broader `@project-gateway/driver-htop` screen-family parsing and actions
- explicit capability downgrades for unsupported helper tools and restricted environments
- expanded fixtures and live integration coverage for the Phase 7 `htop` matrix
- recorder and inspector support that remains sufficient to debug the widened `htop` surface

## Concrete Acceptance Criteria

Phase 7 is complete when all of the following are true:

1. The `htop` driver covers the next screen family beyond the alpha main view.
2. Capability downgrades are explicit and tested.
3. The validated prototype runtime matrix is green for the supported `htop` feature set.
4. The inspector and recorder remain sufficient to debug the implemented `htop` surface live.

## Explicit Non-Goals

Do not start:

- Phase 8 release hardening
- runtime targets outside the current validated `htop 3.5.x` prototype track

Those belong to later phases.
