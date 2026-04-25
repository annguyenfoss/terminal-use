# PLAN_KODAK

Date: 2026-04-24

## Objective

Build a TypeScript end-to-end "terminal-use" platform for Linux and macOS with:

- an open-source skeleton SDK for remote-controllable terminal sessions
- a host runtime that owns the PTY and exposes authoritative terminal state
- a browser/Electron-ready protocol and reference client
- two premium application drivers:
  - `nano`, targeting full interactive feature coverage for supported builds
  - `htop`, targeting full interactive feature coverage for supported builds

This plan assumes:

- TypeScript is used end to end for v1
- the system manages the terminal session itself instead of scraping arbitrary existing terminal tabs
- "full feature coverage" means: if a feature is present in a supported app version and enabled in the running binary/config, the premium driver can detect it, model it, and drive it

## Product Definition

The product is not "terminal sharing" and not "screen scraping only".

It is:

1. a PTY-backed session host
2. a terminal state engine
3. a bidirectional protocol
4. a generic SDK for locators/actions/waits
5. app-specific premium drivers that lift raw cells into semantic elements and actions

The correct abstraction is:

`PTY session -> VT stream -> canonical screen state -> driver semantic model -> SDK locators/actions`

## Core Decisions

### Why TypeScript End to End

TypeScript is not chosen because it is the best low-level systems language. It is chosen because v1 needs one language that can efficiently cover:

- PTY orchestration via `node-pty`
- server-side terminal state via `@xterm/headless`
- browser/Electron clients via `xterm.js`
- protocol types shared across host, SDK, CLI, and UI
- strong DX for the first OSS release

This is a product-speed and ecosystem choice, not a claim that Node is superior to Rust for PTY internals.

### Non-Negotiable Architectural Rules

- The host process owns the PTY.
- The host is the source of truth for terminal state and driver state.
- Clients do not parse terminal state independently for correctness-critical operations.
- Driver actions map to canonical inputs first, mouse clicks second.
- Premium coverage is guaranteed only for managed sessions and supported app versions.
- Arbitrary attach-to-existing-terminal support is explicitly out of scope for v1 production guarantees.

## Success Criteria

The project is successful when all of the following are true:

- A developer can start a managed session from TypeScript and control it over WebSocket or in-process APIs.
- The generic SDK can query raw screen state, subscribe to patches, send input, and wait for changes.
- The `nano` premium module can expose stable semantic elements and actions across all supported interactive modes.
- The `htop` premium module can expose stable semantic elements and actions across all supported interactive modes.
- A reference web app can render the live session, replay recordings, and invoke driver actions.
- The system is testable in CI with deterministic fixtures and golden session replays.

## Non-Goals

These are not v1 goals:

- Supporting arbitrary terminal emulators like Kitty, GNOME Terminal, Konsole, iTerm2 as the primary backend
- A universal DOM for all terminal applications
- Full Windows support
- AI planner/agent logic in the core project
- Pixel-level screen streaming as the source of truth
- A new terminal emulator from scratch

## Support Envelope

### Operating Systems

- Linux: first-class
- macOS: first-class
- Windows: deferred

### Session Model

- Managed sessions: first-class
- Attach-to-existing-PTY or existing terminal tab: experimental later

### Supported Versions

As of this plan date:

- GNU `nano` manual is version `9.0`
- `htop` latest official release is `3.4.1`

The implementation should pin and test against:

- `nano >= 9.0 < 10`
- `htop >= 3.4.1 < 4`

If later versions drift, add a compatibility table rather than assuming forwards compatibility.

## Delivery Shape

Use one monorepo with OSS and premium packages separated by workspace boundaries.

Recommended structure:

```text
apps/
  demo-web/
  inspector-web/
  demo-electron/

packages/
  protocol/
  host/
  sdk/
  driver-kit/
  cli/
  fixtures/
  test-utils/

premium/
  driver-nano/
  driver-htop/

docs/
  architecture/
  protocol/
  drivers/
```

Recommended tooling:

- package manager: `pnpm`
- workspace orchestration: `turbo`
- unit/integration test runner: `vitest`
- browser app bundler: `vite`
- package bundler: `tsup`
- linting: `eslint`
- formatting: `prettier`
- schema/runtime validation: `zod`

## High-Level Architecture

### Package Responsibilities

#### `packages/protocol`

Shared schemas and message definitions:

- transport envelope
- session control messages
- input messages
- snapshot/patch messages
- driver query/action messages
- recording/replay event schema
- capability schema

This package must contain no app logic.

#### `packages/host`

Host runtime:

- spawns and owns PTYs through `node-pty`
- feeds PTY output into `@xterm/headless`
- extracts canonical snapshot state
- computes patches/deltas
- exposes WebSocket and in-process APIs
- loads and runs drivers
- records session IO and state changes

#### `packages/sdk`

Developer-facing API:

- `Session`
- `Screen`
- `Locator`
- `ElementHandle`
- generic actions/waits
- driver registration and typed access

#### `packages/driver-kit`

Shared driver utilities:

- snapshot helpers
- text and region matching
- style and box extraction
- state machine helpers
- action mapping helpers
- capability reporting
- fixture harness

#### `packages/cli`

Operator and developer CLI:

- start session
- attach session
- inspect screen
- dump snapshot
- send key/text/mouse
- record/replay
- driver debug mode

#### `packages/fixtures`

Shared fixtures:

- raw VT transcripts
- expected snapshots
- expected driver semantic outputs
- app-specific golden sessions

#### `premium/driver-nano`

Premium GNU `nano` driver with:

- managed launch profile
- semantic parsing
- typed element model
- typed actions
- mode detection
- capability detection for optional tools

#### `premium/driver-htop`

Premium `htop` driver with:

- managed launch profile
- semantic parsing
- typed element model
- typed actions
- screen/setup/modal detection
- capability detection for optional process/system features

## Detailed Package Layout

This is the recommended initial file/module split.

### `packages/protocol/src`

```text
index.ts
envelope.ts
session.ts
input.ts
screen.ts
query.ts
action.ts
recording.ts
errors.ts
capabilities.ts
zod.ts
```

### `packages/host/src`

```text
index.ts
server.ts
session-manager.ts
session-registry.ts
pty-session.ts
terminal-state.ts
snapshot-builder.ts
patch-builder.ts
driver-runtime.ts
driver-state-store.ts
recording-store.ts
temp-env.ts
feature-detect.ts
app-launchers/
  nano.ts
  htop.ts
transports/
  ws-server.ts
  in-process.ts
```

### `packages/sdk/src`

```text
index.ts
session.ts
screen.ts
locator.ts
element-handle.ts
keyboard.ts
mouse.ts
wait.ts
transport.ts
driver-client.ts
errors.ts
```

### `packages/driver-kit/src`

```text
index.ts
boxes.ts
text.ts
styles.ts
tables.ts
selection.ts
state-machine.ts
capabilities.ts
fixtures.ts
assertions.ts
actions.ts
```

### `premium/driver-nano/src`

```text
index.ts
driver.ts
capabilities.ts
state.ts
modes.ts
parse-layout.ts
parse-prompt.ts
parse-browser.ts
parse-shortcuts.ts
locators.ts
actions.ts
launch-profile.ts
fixtures.ts
```

### `premium/driver-htop/src`

```text
index.ts
driver.ts
capabilities.ts
state.ts
modes.ts
parse-tabs.ts
parse-meters.ts
parse-process-table.ts
parse-function-bar.ts
parse-modals.ts
parse-setup.ts
locators.ts
actions.ts
launch-profile.ts
htoprc.ts
fixtures.ts
```

## Session Lifecycle

### Start

1. Client requests `session.start`.
2. Host spawns PTY with requested command, args, env, cwd, rows, and cols.
3. Host creates a headless terminal instance and binds PTY output to it.
4. Host begins sequence numbering and recording.
5. Host returns session metadata and initial capabilities.

### Run

1. PTY emits bytes.
2. Host writes bytes into headless terminal.
3. Host updates canonical snapshot.
4. Host updates driver state.
5. Host emits patches and semantic events.

### Control

Client can:

- send key/text/paste/mouse/resize
- request a snapshot
- run a locator query
- invoke a driver action
- subscribe to raw or semantic events

### Stop

1. PTY exits or client closes session.
2. Host emits final exit event.
3. Recording is finalized.
4. Session remains replayable if persistence is enabled.

## Canonical State Model

The host must expose one canonical screen model independent of any specific app:

```ts
type Cell = {
  ch: string
  width: 1 | 2
  fg: string | null
  bg: string | null
  bold: boolean
  dim: boolean
  italic: boolean
  underline: boolean
  inverse: boolean
  blink: boolean
  invisible: boolean
  strike: boolean
}

type Cursor = {
  x: number
  y: number
  visible: boolean
  shape: 'block' | 'bar' | 'underline' | 'unknown'
}

type ScreenSnapshot = {
  revision: number
  cols: number
  rows: number
  activeBuffer: 'primary' | 'alternate'
  title: string | null
  cursor: Cursor
  lines: Cell[][]
  plainTextLines: string[]
  scrollbackLines: string[]
}
```

The canonical model must be app-agnostic and serializable.

## Delta Model

Do not stream full snapshots for every repaint.

Use:

- full snapshot on connect or explicit request
- row-level patching by default
- optional cell-level patch within dirty rows

Recommended patch shape:

```ts
type ScreenPatch = {
  fromRevision: number
  toRevision: number
  rows: Array<{
    y: number
    text: string
    cells: Cell[]
  }>
  cursor?: Cursor
  title?: string | null
  activeBuffer?: 'primary' | 'alternate'
}
```

For v1, prioritize correctness over minimal bandwidth. Start with dirty-row replacement and optimize later.

## Protocol

Transport: WebSocket first, in-process transport second.

Every message should use a versioned envelope:

```ts
type Envelope<T extends string, P> = {
  v: 1
  id?: string
  sessionId?: string
  type: T
  payload: P
}
```

### Core Client-to-Host Messages

- `hello`
- `session.start`
- `session.attach`
- `session.stop`
- `session.resize`
- `input.key`
- `input.text`
- `input.paste`
- `input.mouse`
- `screen.get`
- `query.run`
- `action.invoke`
- `recording.start`
- `recording.stop`

### Core Host-to-Client Messages

- `hello.ok`
- `session.started`
- `session.exited`
- `screen.snapshot`
- `screen.patch`
- `query.result`
- `action.result`
- `event.raw`
- `event.semantic`
- `error`

### Versioning Rules

- Protocol messages must be forward-extensible.
- Unknown fields are ignored.
- Drivers report their own semantic version separately from the core protocol version.

### Concrete Message Examples

#### Start Session

```json
{
  "v": 1,
  "id": "req_1",
  "type": "session.start",
  "payload": {
    "command": "nano",
    "args": ["notes.txt"],
    "cwd": "/tmp/demo",
    "rows": 40,
    "cols": 120,
    "driver": "nano"
  }
}
```

#### Snapshot

```json
{
  "v": 1,
  "sessionId": "sess_1",
  "type": "screen.snapshot",
  "payload": {
    "revision": 14,
    "cols": 120,
    "rows": 40,
    "activeBuffer": "alternate",
    "cursor": { "x": 8, "y": 12, "visible": true, "shape": "block" },
    "plainTextLines": ["GNU nano 9.0", "..."]
  }
}
```

#### Driver Action

```json
{
  "v": 1,
  "id": "req_2",
  "sessionId": "sess_1",
  "type": "action.invoke",
  "payload": {
    "driver": "nano",
    "name": "saveAs",
    "args": { "path": "/tmp/demo/out.txt" }
  }
}
```

#### Semantic Event

```json
{
  "v": 1,
  "sessionId": "sess_1",
  "type": "event.semantic",
  "payload": {
    "driver": "nano",
    "mode": "writeOut",
    "elements": [
      {
        "id": "shortcut_writeout",
        "role": "helpShortcut",
        "name": "Write Out",
        "origin": "driver",
        "confidence": 1
      }
    ]
  }
}
```

## SDK Shape

The generic SDK should feel Playwright-like without pretending terminals have DOMs.

### Core API

```ts
const session = await Session.start({
  command: 'nano',
  args: ['notes.txt'],
  rows: 40,
  cols: 120,
})

await session.keyboard.type('hello')
await session.keyboard.press('CTRL_O')

const snapshot = await session.screen.snapshot()
const el = await session.locator.text('Write Out').first()
await el.press()
```

### Driver Access

```ts
const nano = await session.use(nanoDriver)
await nano.insert('hello')
await nano.save()

const htop = await session.use(htopDriver)
await htop.filter('/usr/bin')
await htop.killSelected('TERM')
```

### Generic Locator Model

```ts
type ElementOrigin = 'driver' | 'heuristic'

type Element = {
  id: string
  role: string
  name?: string
  text?: string
  origin: ElementOrigin
  confidence: number
  box?: { x: number; y: number; w: number; h: number }
  actions: string[]
}
```

### Generic Locator Strategies

- `text()`
- `regex()`
- `region()`
- `style()`
- `role()`
- `name()`
- `near()`
- `focused()`

### Wait API

- `waitForText`
- `waitForChange`
- `waitForStable`
- `waitForElement`
- `waitForMode`

## Driver Kit Contract

Each driver must implement:

```ts
interface Driver<TState, TCapabilities> {
  id: string
  version: string
  detect(snapshot: ScreenSnapshot): number
  capabilities(snapshot: ScreenSnapshot): TCapabilities
  parse(snapshot: ScreenSnapshot): TState
  locate(state: TState, query: unknown): Element[]
  invoke(action: unknown, state: TState, io: DriverIO): Promise<ActionResult>
}
```

`DriverIO` is the only place a driver can:

- send keys
- send text
- send mouse
- resize
- request fresh snapshot
- wait for patch/revision/mode changes

Drivers must never mutate session state directly.

## Managed Launch Strategy

Managed launch is mandatory for premium guarantees.

Reasons:

- app config matters
- terminal size matters
- locale matters
- feature detection matters
- optional external tools matter

The host must be able to launch apps with an isolated profile/home/config directory for reproducibility.

## `nano` Premium Driver Plan

### Support Target

- GNU `nano` 9.x
- Linux and macOS
- stock build with common features enabled
- managed launch only for full guarantees

### Managed Launch Profile

Recommended launch:

- command: `nano`
- env:
  - `TERM=xterm-256color`
  - `LC_ALL=C.UTF-8`
  - isolated `HOME`
- args:
  - `--ignorercfiles`
  - `--mouse`

Optional controlled variants for test coverage:

- `--multibuffer`
- `--linenumbers`
- `--positionlog`
- `--softwrap`
- `--restricted`

### Capability Detection

At startup, report:

- `mouse`
- `multibuffer`
- `lineNumbers`
- `positionLog`
- `speller`
- `formatter`
- `linter`
- `helpViewer`
- `fileBrowser`
- `restrictedMode`

For `speller`, `formatter`, and `linter`, detect both:

- compile-time/build availability
- runtime tool availability

### Screen Anatomy

The driver should model these top-level regions:

- `titleBar`
- `editViewport`
- `statusBar`
- `helpLines`

### Mode State Machine

The `nano` driver should explicitly model modes:

- `editor`
- `help`
- `browser`
- `search`
- `replace`
- `replaceConfirm`
- `gotoLine`
- `writeOut`
- `readFile`
- `execute`
- `spell`
- `linter`
- `yesNo`

Do not rely on one-off heuristics for mode detection. Build deterministic mode classifiers using:

- status-bar prompts
- bottom help labels
- cursor placement
- title bar content
- known prompt toggles

### Semantic State Model

Recommended `nano` state:

```ts
type NanoState = {
  mode: NanoMode
  fileName: string | null
  modified: boolean
  cursor: { line: number | null; column: number | null; x: number; y: number }
  titleBar: string
  statusBar: string
  helpShortcuts: Array<{ key: string; label: string; box: Box }>
  prompt: null | {
    text: string
    input: string
    toggles: string[]
  }
  browser: null | {
    cwd: string | null
    entries: BrowserEntry[]
    selectedIndex: number | null
  }
  visibleText: string[]
  anchorsVisible: number[]
  markActive: boolean | 'unknown'
}
```

### Elements To Expose

- `titleBar`
- `statusBar`
- `helpShortcut`
- `editorViewport`
- `cursor`
- `prompt`
- `promptToggle`
- `browserEntry`
- `selectedBrowserEntry`
- `spellCandidate`
- `linterMessage`

### Actions To Expose

Generic editor actions:

- `insert(text)`
- `press(key)`
- `move(direction, count?)`
- `gotoLine(line, column?)`
- `save()`
- `saveAs(path)`
- `openFile(path)`
- `readFile(path)`
- `search(query, options)`
- `replace(search, replacement, options)`
- `toggleMark()`
- `copySelection()`
- `cutSelection()`
- `paste()`
- `undo()`
- `redo()`

Advanced actions:

- `openHelp()`
- `closeHelp()`
- `openBrowser()`
- `browserSelect(pathOrIndex)`
- `executeCommand(command, options)`
- `runSpeller()`
- `runFormatter()`
- `jumpNextLint()`
- `jumpPrevLint()`
- `recordMacro()`
- `playMacro()`
- `placeAnchor()`
- `jumpAnchor(direction)`
- `switchBuffer(direction | index)`

### Feature Coverage Plan

To claim full premium coverage, the driver must support:

- modeless editing
- status-bar prompts
- search/replace flows
- mark/cut/copy/paste flows
- mouse-triggered help shortcuts
- anchors
- macros
- help viewer
- file browser
- execute/filter command mode
- spelling mode
- formatting mode
- linting mode
- multibuffer flows
- restricted mode capability downgrades

### `nano` Testing Strategy

#### Unit Tests

- prompt parser
- title/status/help line parser
- mode classifier
- browser entry parser
- shortcut parser

#### Integration Tests

Spawn real `nano` and cover:

- open file
- save file
- search/replace
- mark/cut/paste
- browser navigation
- execute command
- spell check if available
- formatter/linter if configured
- help viewer
- multibuffer switching

#### Golden Fixtures

Capture raw VT transcripts for:

- empty buffer
- modified buffer
- search prompt
- replace prompt
- help viewer
- browser
- execute mode
- linter mode

## `htop` Premium Driver Plan

### Support Target

- `htop` 3.4.x
- Linux and macOS
- managed launch only for full guarantees

### Managed Launch Profile

Use isolated config with known defaults.

Requirements:

- fixed terminal geometry for tests: `140x45`
- isolated `XDG_CONFIG_HOME`
- generated `htoprc`
- known color scheme
- known field order
- known meter configuration
- mouse enabled

Two managed profiles:

- `common`: simplified for most users
- `full`: enables more surfaces for test coverage, including screen tabs

### Capability Detection

The driver must report runtime capabilities, not assume them:

- `screenTabs`
- `functionBar`
- `treeView`
- `tagging`
- `affinity`
- `strace`
- `openFiles`
- `fileLocks`
- `backtrace`
- `readonly`
- `sensors`
- `delayAccounting`
- `containerHiding`
- `userFilter`
- `signalMenu`
- `dynamicMeters`

Capability inputs come from:

- parsed version string
- managed config
- OS/platform
- presence of helper tools like `strace` and `lsof`
- visible menus and runtime prompts

### Surface Model

`htop` is not one screen. The driver must treat it as a family of screens:

- main process view
- help screen
- setup screen root
- setup subpanels
- signal menu
- affinity screen
- open files screen
- locks screen
- command line screen
- strace screen
- environment/info screens where present

### Main View State Model

Recommended `htop` state:

```ts
type HtopState = {
  mode: HtopMode
  tabs: Array<{ name: string; selected: boolean }>
  meters: MeterState[]
  processHeader: TableHeader
  processRows: ProcessRow[]
  selectedRow: number | null
  selectedPid: number | null
  sortColumn: string | null
  sortDirection: 'asc' | 'desc' | null
  treeView: boolean
  filterText: string | null
  searchText: string | null
  paused: boolean
  taggedPids: number[]
  functionBar: FunctionKey[]
  modal: HtopModal | null
}
```

### Elements To Expose

- `tab`
- `meter`
- `processHeader`
- `processColumn`
- `processRow`
- `selectedProcess`
- `functionKey`
- `modal`
- `modalOption`
- `setupCategory`
- `setupOption`
- `signalOption`
- `affinityCpu`

### Actions To Expose

Main screen actions:

- `moveSelection(direction, count?)`
- `page(direction)`
- `home()`
- `end()`
- `scrollHorizontal(direction, count?)`
- `tagSelected()`
- `tagChildren()`
- `clearTags()`
- `filter(text)`
- `search(text)`
- `searchNext()`
- `searchPrev()`
- `toggleTree()`
- `sortBy(column)`
- `invertSort()`
- `followSelected()`
- `toggleKernelThreads()`
- `toggleUserThreads()`
- `toggleContainers()`
- `toggleProgramPath()`
- `togglePause()`
- `toggleMergeExeCommCmdline()`
- `refresh()`
- `quit()`

Process actions:

- `killSelected(signal)`
- `reniceSelected(deltaOrValue)`
- `setAutogroupPriority(deltaOrValue)`
- `setAffinity(cpus)`
- `showOpenFiles()`
- `showLocks()`
- `showCommandLine()`
- `showStrace()`
- `showBacktrace()`

Setup actions:

- `openHelp()`
- `openSetup()`
- `setupSelectCategory(name)`
- `setupToggleOption(name)`
- `setupSetColorScheme(name)`
- `setupSetFields(columns)`
- `setupSetMeters(layout)`
- `setupSetDisplayOption(name, value)`
- `setupSaveAndExit()`

### Full Feature Coverage Plan

To claim full premium coverage, the driver must support all visible `htop` interactive features in supported builds, including:

- main process list navigation
- screen tabs when enabled
- tagging and multi-process operations
- search and filter
- tree mode and subtree expand/collapse
- sort selection and inversion
- follow mode
- thread/process visibility toggles
- path/merge/pause toggles
- signal menu
- nice and autogroup priority changes
- CPU affinity
- setup flows
- help screen
- optional side screens such as command line, locks, open files, and strace when available

### `htop` Implementation Strategy

`htop` needs stricter mode handling than `nano`.

Recommended subdrivers:

- `mainViewParser`
- `setupViewParser`
- `helpViewParser`
- `signalMenuParser`
- `affinityViewParser`
- `infoViewParser`

The driver should not try to interpret every meter generically at first. Instead:

- parse all meter boxes and labels
- structure known meters from the managed profile
- allow unknown meters to remain as generic labeled regions

This keeps the driver extensible without blocking v1.

### `htop` Testing Strategy

#### Unit Tests

- table header parser
- process row parser
- function bar parser
- modal/menu parser
- setup option parser
- meter region parser

#### Integration Tests

Spawn real `htop` with seeded config and cover:

- search/filter
- sort changes
- tree mode toggle
- tagging
- kill/renice signal flows against disposable child processes
- affinity screen where available
- help/setup screens
- open files and strace when dependencies are present

#### Golden Fixtures

Capture fixtures for:

- main view idle
- filtered view
- search active
- tree mode expanded/collapsed
- setup screen
- signal menu
- affinity screen
- strace screen
- help screen

## Generic Heuristic Layer

The OSS skeleton should still provide useful generic capabilities without premium drivers.

Generic heuristics should include:

- text matching
- region clustering
- inverse-video and color-band detection
- border and boxed-region detection
- bottom help-bar detection
- table header and row segmentation
- selected-row inference

These heuristics are not a replacement for premium drivers. They are a fallback and a contributor on-ramp.

## Recording and Replay

The system needs built-in recording from day one.

Record:

- raw PTY output chunks
- input events
- resize events
- snapshot checkpoints
- driver semantic events

Use a JSON event log format inspired by asciicast concepts, but keep internal format under project control.

Replay modes:

- raw VT replay
- state replay
- semantic replay

Use replay heavily in tests and bug reports.

## First Six Sprints

Treat the first six sprints as fixed implementation blocks.

### Sprint 1: Workspace and Protocol

Goals:

- create monorepo
- add build/lint/test plumbing
- define protocol types and zod schemas
- implement in-process transport first

Deliverables:

- `packages/protocol`
- empty `packages/host` and `packages/sdk`
- CI with typecheck and unit tests

### Sprint 2: Minimal PTY Host

Goals:

- spawn `bash`
- write keyboard input
- collect PTY output
- feed output into headless terminal

Deliverables:

- `pty-session.ts`
- `terminal-state.ts`
- `snapshot-builder.ts`
- shell smoke tests

### Sprint 3: Snapshot, Patch, and Inspector

Goals:

- produce stable snapshots
- emit dirty-row patches
- render live state in inspector web app

Deliverables:

- `patch-builder.ts`
- `apps/inspector-web`
- reconnect-safe snapshot request path

### Sprint 4: SDK and Generic Locators

Goals:

- `Session`
- `Screen`
- generic locator text/region/style APIs
- wait helpers

Deliverables:

- `packages/sdk`
- shell-based integration tests

### Sprint 5: Driver Kit and Fixture Harness

Goals:

- implement driver contract
- fixture recorder
- semantic event channel
- toy demo driver

Deliverables:

- `packages/driver-kit`
- recorded replay tests

### Sprint 6: `nano` Foundations

Goals:

- managed launch profile
- parse screen layout
- parse status/prompt/help lines
- implement first editor/help/browser actions

Deliverables:

- `premium/driver-nano` first usable alpha
- first golden fixtures

## CLI and Debugging Tools

Ship an internal-quality CLI early. It will accelerate driver work.

Recommended commands:

- `kodak start`
- `kodak attach`
- `kodak screen dump`
- `kodak input key`
- `kodak input text`
- `kodak query`
- `kodak action`
- `kodak record`
- `kodak replay`
- `kodak driver inspect`

The CLI should support:

- printing current mode
- printing parsed driver state
- showing detected elements with boxes and confidence
- saving fixtures from live sessions

## Web Reference Client

The reference client should not be a side project. It is a core debugging tool.

Features:

- live xterm.js rendering
- current revision and mode display
- raw events pane
- semantic state pane
- element inspector overlay
- recording controls
- replay mode
- action console

This app is how driver developers and users will understand what the system thinks it sees.

## Quality Gates

### Correctness

- no dropped PTY bytes
- patches always apply cleanly to snapshot base revision
- driver parse is deterministic
- action methods either succeed or return actionable structured errors

### Stability

- host survives repaint storms
- reconnect does not corrupt state
- resize under load is correct
- session close and process exit are cleanly handled

### DX

- one-command local dev
- fixture-driven tests
- typed public APIs
- reproducible managed profiles

## CI Matrix

Run CI on:

- Linux latest
- macOS latest

Install test dependencies:

- `nano`
- `htop`
- `lsof`
- `strace` on Linux
- spell/formatter/linter helpers for nano test flows

Split jobs:

- lint/typecheck
- unit tests
- integration tests
- replay/golden tests
- demo-web smoke tests

## Security and Isolation

### v1

- local development and trusted-operator focus
- session-level IDs
- per-session temp directories
- no shell interpolation in host commands
- explicit allowlist for managed app launches

### v2

- auth tokens
- multi-user access control
- session ownership and observer/controller roles
- audit logs

## Licensing and Legal Caution

`nano` and `htop` are GPL projects.

Implementation rules:

- do not copy app source code into premium drivers
- do not ship copied help text or copied UI strings beyond what appears in live app sessions or public docs
- do not vendor app configs or source fragments without checking license implications
- keep driver behavior clean-room and observation-based

If premium modules are distributed under a different license model, get legal review before release.

## Delivery Phases

### Phase 0: Repo Bootstrap

Deliverables:

- monorepo scaffold
- tooling config
- shared tsconfig
- lint/test/build scripts
- protocol package shell

Definition of done:

- clean install
- clean build
- CI green on empty scaffold

### Phase 1: Host Core

Deliverables:

- PTY spawn/close/resize
- headless terminal binding
- canonical snapshot extraction
- row patching
- WebSocket transport
- recording skeleton

Definition of done:

- shell session can be started and remotely controlled
- screen snapshot is correct after common shell interactions

### Phase 2: SDK Skeleton

Deliverables:

- `Session`
- `Screen`
- `Locator`
- `Keyboard`
- `Mouse`
- wait helpers
- in-process transport

Definition of done:

- generic tests can control a shell and locate plain text regions

### Phase 3: Driver Kit and Inspector

Deliverables:

- driver contract
- fixture harness
- semantic event pipeline
- inspector web app

Definition of done:

- sample toy driver works
- developers can inspect driver parse results live

### Phase 4: `nano` Premium Driver

Deliverables:

- managed launch profile
- mode classifier
- semantic state parser
- typed actions
- full regression fixture set

Definition of done:

- supported `nano` features are covered in CI
- common editing flows are stable

### Phase 5: `htop` Premium Driver

Deliverables:

- managed `htoprc` generator
- mode/subscreen parsers
- process table model
- setup/model actions
- process action flows

Definition of done:

- supported `htop` features are covered in CI
- disposable test processes can be safely manipulated

### Phase 6: Hardening

Deliverables:

- reconnect handling
- replay tooling
- performance tuning
- better errors and tracing

Definition of done:

- sessions remain stable over long runs
- bug reports can attach a replay bundle

### Phase 7: Public Release

Deliverables:

- docs site
- examples
- versioned releases
- contribution guide for community drivers

Definition of done:

- OSS core releasable
- premium drivers releasable

## Suggested Timeline

Assuming one strong engineer full-time:

- Phase 0: 1 week
- Phase 1: 2 weeks
- Phase 2: 2 weeks
- Phase 3: 2 weeks
- Phase 4: 3 weeks
- Phase 5: 4 weeks
- Phase 6: 2 weeks
- Phase 7: 1 week

Total: 17 weeks

With two engineers, this can compress materially if one owns host/protocol and one owns drivers/fixtures.

## Team Split Recommendation

If more than one engineer is involved:

- Engineer A: host, protocol, SDK, recorder, inspector
- Engineer B: `nano` driver and fixtures
- Engineer C: `htop` driver and fixtures

The write scopes should remain separate as long as possible.

## Biggest Risks and Mitigations

### Risk: App customization explodes the state space

Mitigation:

- managed sessions only for premium guarantees
- isolated config profiles
- capability reporting

### Risk: Heuristic drift across app versions

Mitigation:

- version pinning
- fixture suites per app version
- explicit compatibility tables

### Risk: Optional external tools make tests flaky

Mitigation:

- runtime capability checks
- separate required and optional test suites
- disposable helper binaries/scripts in CI

### Risk: Driver actions race UI repaints

Mitigation:

- revision-based waits
- explicit `waitForStable`
- action methods own their postconditions

### Risk: `htop` setup and info screens become messy

Mitigation:

- split into subscreen parsers
- do not overload one monolithic parser

## Definition of "Full Coverage"

For this project, "full coverage" does not mean "every theoretical compile-time variant ever built by any distro".

It means:

- every documented interactive feature visible in supported app versions
- when launched through the managed profile
- with runtime capability reporting for optional or dependency-based features

Examples:

- if `nano` has linting disabled in the installed binary, the driver reports `linter: false`
- if `htop` is built without backtrace support, the driver reports `backtrace: false`
- if `strace` is missing on the host, the driver reports `strace: false`

That is still honest full coverage for the supported runtime, which is the only sane standard.

## Immediate Next Implementation Step

After this plan is accepted, the first concrete coding step should be:

1. scaffold the monorepo
2. implement `packages/protocol`
3. implement a minimal `packages/host` that can start `bash`, emit snapshots, and accept key input
4. build the inspector web app before touching premium drivers

Do not start with `nano` or `htop` parsing before the host, protocol, and inspector exist.

## References

- `node-pty`: https://github.com/microsoft/node-pty
- `xterm.js` and `@xterm/headless`: https://github.com/xtermjs/xterm.js/
- GNU `nano` manual 9.0: https://www.nano-editor.org/dist/latest/nano.html
- `htop` official repository: https://github.com/htop-dev/htop
- `htop` man page source: https://raw.githubusercontent.com/htop-dev/htop/main/htop.1.in
- `htop` latest releases: https://github.com/htop-dev/htop/releases
