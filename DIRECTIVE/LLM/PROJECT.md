# Project Overview

## Summary

This repository defines and will implement a TypeScript end-to-end terminal-use platform.

The platform is intended to provide:

- a host/runtime that owns PTY-backed sessions
- a canonical screen-state model derived from VT output
- a bidirectional protocol for local and remote control
- a TypeScript SDK for application builders
- recorder and inspector tooling
- premium application drivers for GNU `nano` and `htop`

## Product Direction

The product is not just screen sharing and not just terminal scraping.

The intended architecture is:

`PTY session -> VT stream -> canonical screen state -> app driver -> SDK elements/actions`

Generic heuristics are allowed as fallback, but premium-quality control comes from app-specific drivers.

## v0.1 Boundaries

In scope:

- Linux and macOS
- managed sessions
- local and remote control through the same host/protocol model
- TypeScript end to end
- premium drivers for `nano 9.x` and `htop 3.4.x`

Out of scope:

- Windows / ConPTY
- arbitrary GUI terminal scraping as a primary backend
- a universal DOM for terminal apps
- non-TypeScript SDKs in v0.1

## Canonical Documents

- Master plan: [../PLAN/PLAN_FINAL.md](../PLAN/PLAN_FINAL.md)
- Execution status: [../PLAN/EXECUTION_STATUS.md](../PLAN/EXECUTION_STATUS.md)
- Active phases: [../PLAN/PHASE/](../PLAN/PHASE/)
- Archived alternatives: [../PLAN/ARCHIVE/](../PLAN/ARCHIVE/)
