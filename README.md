# terminal-use: Because why the hell no

Forget Computer Use. Forget Browser Use. Big-boy LLM labs are burning through your wallet to click buttons and move mice around.

You do not need that.

You need **Terminal Use**.

`terminal-use` is a TypeScript terminal automation stack for **managed PTY sessions**. It launches terminal apps locally, parses the screen into a canonical state model, exposes that state over a protocol, and lets SDKs, inspectors, and drivers control real terminal software like:

- GNU `nano`
- `htop`
- plain shell sessions

This repo is not a pitch deck. It is the implementation workspace.

## What It Does

- starts and owns local PTY sessions
- keeps a canonical VT-backed screen model
- exposes local and WebSocket control
- ships a TypeScript SDK
- includes a live inspector
- includes premium alpha drivers for `nano` and `htop`

## Current Status

Working today:

- managed shell sessions
- WebSocket host
- inspector web app
- `nano` alpha driver
- `htop` alpha driver
- recorder plumbing

Current scope:

- Linux and macOS managed sessions
- `htop` support is Linux-first
- managed sessions only

Not supported:

- attaching to arbitrary existing terminal windows or tabs
- Windows
- browser-style “computer use” nonsense

## Repo Layout

```text
apps/inspector-web     live browser inspector
packages/host          PTY host/runtime
packages/protocol      wire protocol and schemas
packages/sdk           TypeScript client SDK
packages/cli           local CLI entrypoints
packages/driver-kit    driver primitives
packages/recorder      recording bundle writer
packages/testing       deterministic demo fixtures
premium/driver-nano    GNU nano driver
premium/driver-htop    htop driver
```

## Prerequisites

- Node.js `>=22`
- `pnpm`
- `nano 9.0.x` for the current nano driver
- `htop 3.5.x` for the current htop driver

## Install

```bash
pnpm install
```

## Verify

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

## Fast Start

Build the repo:

```bash
pnpm build
```

Start a local `nano` host:

```bash
node packages/cli/dist/cli.js host-nano --port 3000
```

Start a local `htop` host:

```bash
node packages/cli/dist/cli.js host-htop --port 3000
```

The WebSocket endpoint is:

```text
ws://127.0.0.1:3000/ws
```

## Start `nano` Over WebSocket

After connecting, send:

```json
{
  "v": 1,
  "id": "hello-1",
  "type": "hello",
  "payload": {
    "clientName": "manual"
  }
}
```

Then:

```json
{
  "v": 1,
  "id": "start-1",
  "type": "session.start",
  "payload": {
    "profile": "nano",
    "profileArgs": {
      "file": "/tmp/designcat.sql"
    }
  }
}
```

## Start `htop` Over WebSocket

```json
{
  "v": 1,
  "id": "start-1",
  "type": "session.start",
  "payload": {
    "profile": "htop",
    "profileArgs": {
      "readonly": true
    }
  }
}
```

Limit `htop` to specific PIDs:

```json
{
  "v": 1,
  "id": "start-2",
  "type": "session.start",
  "payload": {
    "profile": "htop",
    "profileArgs": {
      "readonly": true,
      "pids": [1234, 5678]
    }
  }
}
```

## Inspector

Run the live inspector:

```bash
pnpm --filter @terminal-use/inspector-web exec vite --host 127.0.0.1 --port 5173
```

Then:

1. open the inspector in your browser
2. connect to `ws://127.0.0.1:3000/ws`
3. choose `nano` or `htop`
4. start a managed session

For `nano`, pass a file path in the file input.

## CLI Smoke Tests

Record a managed `nano` session:

```bash
node packages/cli/dist/cli.js record-nano --out /tmp/tu-nano --file /tmp/tu-nano.txt
```

Record a managed `htop` session:

```bash
node packages/cli/dist/cli.js record-htop --out /tmp/tu-htop
```

Enable writable `htop` mode:

```bash
node packages/cli/dist/cli.js record-htop --out /tmp/tu-htop --readwrite
```

## What This Is Not

- not a browser automation wrapper
- not a VNC toy
- not screenshot-diff automation
- not an “AI clicks around desktop apps” product

This is for people who know the terminal is the real interface and want a deterministic way to automate it.

## Docs

- [Project Overview](DIRECTIVE/LLM/PROJECT.md)
- [Master Plan](DIRECTIVE/PLAN/PLAN_FINAL.md)
- [Execution Status](DIRECTIVE/PLAN/EXECUTION_STATUS.md)

## Motto

Because why the hell no.
