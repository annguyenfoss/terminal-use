# Project Gateway

Phase 0 is a lean TypeScript workspace scaffold for the terminal-use platform defined in `DIRECTIVE/PLAN/PLAN_FINAL.md`.

The repo currently provides:

- a pnpm workspace
- TypeScript project references
- build, typecheck, lint, and test plumbing
- package shells for the planned OSS and premium modules
- an initial protocol package with Zod-backed message schemas

## Prerequisites

- Node.js 22 or newer
- Corepack

## Bootstrap

```bash
mkdir -p "$HOME/.local/bin" "$HOME/.cache/corepack"
COREPACK_HOME="$HOME/.cache/corepack" corepack enable --install-directory "$HOME/.local/bin"
PATH="$HOME/.local/bin:$PATH" COREPACK_HOME="$HOME/.cache/corepack" pnpm install
```

## Workspace Commands

```bash
PATH="$HOME/.local/bin:$PATH" COREPACK_HOME="$HOME/.cache/corepack" pnpm build
PATH="$HOME/.local/bin:$PATH" COREPACK_HOME="$HOME/.cache/corepack" pnpm typecheck
PATH="$HOME/.local/bin:$PATH" COREPACK_HOME="$HOME/.cache/corepack" pnpm lint
PATH="$HOME/.local/bin:$PATH" COREPACK_HOME="$HOME/.cache/corepack" pnpm test
```

## Phase Boundary

This scaffold intentionally stops before PTY, transport, or driver behavior. The next implementation step is Phase 1 host-core work.
