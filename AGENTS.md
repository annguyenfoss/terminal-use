# AGENTS.md

## Project

This repository is the planning and implementation workspace for a TypeScript end-to-end terminal-use framework.

The intended product is:

- a managed PTY host/runtime that owns terminal sessions
- a canonical terminal-state layer backed by VT parsing
- a versioned protocol for local and remote control
- a TypeScript SDK for locators, waits, and driver actions
- premium drivers for GNU `nano` and `htop`

The v0.1 target is Linux and macOS with managed sessions only. Arbitrary existing terminal tabs and Windows support are out of scope for now.

## Canonical References

- Project overview: [DIRECTIVE/LLM/PROJECT.md](DIRECTIVE/LLM/PROJECT.md)
- Master plan: [DIRECTIVE/PLAN/PLAN_FINAL.md](DIRECTIVE/PLAN/PLAN_FINAL.md)
- Execution status: [DIRECTIVE/PLAN/EXECUTION_STATUS.md](DIRECTIVE/PLAN/EXECUTION_STATUS.md)
- Active phase docs: [DIRECTIVE/PLAN/PHASE/](DIRECTIVE/PLAN/PHASE/)

## Working Guidance

- Treat `DIRECTIVE/PLAN/PLAN_FINAL.md` as the canonical scope and architecture document.
- Keep execution progress in `DIRECTIVE/PLAN/EXECUTION_STATUS.md`.
- Keep active implementation tasks in the relevant phase doc under `DIRECTIVE/PLAN/PHASE/`.
- Keep superseded or alternative plans under `DIRECTIVE/PLAN/ARCHIVE/`.
