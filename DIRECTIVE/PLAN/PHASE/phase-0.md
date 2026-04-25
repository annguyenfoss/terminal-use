# Phase 0

## Goal

Bootstrap the monorepo and create the minimal project structure needed to enter host-core implementation cleanly.

This phase is intentionally boring. It should eliminate future friction around package boundaries, build tooling, and workspace conventions.

## Scope

In scope:

- workspace root setup
- package shells
- shared TypeScript configuration
- linting, formatting, typechecking, test plumbing
- initial `packages/protocol` shell

Out of scope:

- PTY spawning
- host runtime behavior
- WebSocket transport
- inspector UI
- recorder implementation
- `nano` or `htop` drivers

Prototype execution note:

- this phase is intentionally lean
- local verification is required
- CI, release tooling, `apps/`, `docs/`, and other non-blocking empty scaffolds are deferred

## Deliverables

### Root Files

Create:

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `eslint.config.js`
- `.prettierrc`
- `.editorconfig`
- `.gitignore`
- `README.md`

### Root Directories

Create:

- `packages/`
- `premium/`

Defer until needed:

- `apps/`
- `docs/`
- other non-blocking empty roots

### Package Shells

Create:

- `packages/protocol`
- `packages/host`
- `packages/sdk`
- `packages/driver-kit`
- `packages/recorder`
- `packages/testing`
- `packages/cli`
- `premium/driver-nano`
- `premium/driver-htop`

Each package should have:

- `package.json`
- `tsconfig.json`
- `src/index.ts`

### Protocol Shell

Within `packages/protocol/src`, create:

- `index.ts`
- `envelope.ts`
- `hello.ts`
- `session.ts`
- `input.ts`
- `screen.ts`
- `query.ts`
- `action.ts`
- `events.ts`
- `recording.ts`
- `errors.ts`
- `capabilities.ts`
- `zod.ts`

These can begin as placeholder exports, but the file structure must match the master plan.

## Technical Requirements

### Package Manager and Build

- use `pnpm`
- use TypeScript project references
- use `tsc --build`
- use `turbo` only for orchestration/caching, not as a substitute for package correctness

### Lint and Format

- `eslint`
- `prettier`
- root commands must work from the repo root

### Scripts

Root scripts must include:

- `build`
- `typecheck`
- `lint`
- `test`

Package scripts should be minimal and aligned with root orchestration.

## Suggested File Ownership

Phase 0 mainly touches:

- root config files
- `packages/*/package.json`
- `packages/*/tsconfig.json`
- `packages/*/src/index.ts`

No package should contain substantive business logic yet.

## Acceptance Criteria

Phase 0 is complete when:

- `pnpm install` succeeds
- `pnpm build` succeeds
- `pnpm typecheck` succeeds
- `pnpm lint` succeeds
- `pnpm test` succeeds
- package imports resolve correctly across project references

For the lean prototype track, local verification is sufficient in this phase. CI can land later without blocking the move to Phase 1.

## Test Plan

At minimum:

- one trivial test proves the test runner is wired
- the root build and typecheck pipeline is green
- no unresolved package entrypoints remain

## Exit Notes

Do not start adding host behavior in Phase 0 just because the scaffolding is easy to continue. Move to Phase 1 once the scaffold is clean.
