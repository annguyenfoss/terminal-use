# PLAN_FINAL

Date: 2026-04-24

## Purpose

This document merges `PLAN_KODAK.md` and `PLAN_COLGATE.md` into one implementation plan for a TypeScript end-to-end terminal-use platform with:

- an OSS skeleton SDK
- a host/runtime that owns the PTY and terminal state
- a bidirectional protocol for local and remote control
- a reference inspector and recorder
- two premium modules with full supported-runtime coverage:
  - GNU `nano` 9.x
  - `htop` 3.4.x

This merged plan keeps the stronger architecture from `PLAN_KODAK.md`, keeps the richer feature/API detail from `PLAN_COLGATE.md`, and corrects factual errors and scope mismatches found during review.

## Executive Decisions

### Product Shape

v0.1 is not just a local library and not just a remote daemon.

v0.1 includes both:

- an in-process TypeScript SDK
- a host/runtime with a versioned protocol that can be used locally or remotely

That is non-negotiable because the long-term product is a reusable middle layer for terminal application control.

### Language and Stack

Use TypeScript end to end for v0.1:

- PTY: `node-pty`
- VT parser and server-side state: `@xterm/headless`
- rendering and browser client: `xterm.js`
- schemas: `zod`
- workspace: `pnpm`
- tests: `vitest`

TypeScript is the v0.1 product-speed choice, not the final statement on systems-language purity.

### App Model

There is no universal terminal DOM.

The architecture must be:

`PTY session -> VT stream -> canonical screen state -> app driver -> SDK elements/actions`

Generic heuristics exist as fallback, but premium quality comes from app-specific drivers.

### Premium Coverage Contract

"Full coverage" means:

- every documented interactive feature visible in the supported app version
- when launched through the managed profile
- with runtime capability reporting for optional features and optional helper tools

It does not mean every possible distro patch or every compile-time variant ever shipped by anyone.

### Managed Sessions

Premium guarantees apply to managed sessions only.

Attaching to arbitrary existing terminal tabs, shells, tmux panes, or GUI terminals is explicitly out of scope for production guarantees in v0.1.

### Map Runtime

The graph/fingerprint/map concept from `PLAN_COLGATE.md` is useful, but it should not be the center of the v0.1 architecture.

Decision:

- do not ship a public `@map` package as a foundational dependency in v0.1
- build the core around host state, driver state, actions, locators, and fixtures
- if needed, add an internal `playbook` or `map-authoring` layer later for recorder-generated flows

This avoids making `htop` volatility and transition-graph authoring the critical path.

## Validated Baseline

Validated against current primary sources on 2026-04-24:

- GNU `nano` manual is 9.0
- latest `htop` release is 3.4.1
- `xterm.js` provides `@xterm/headless`
- `node-pty` remains the standard PTY binding in Node

Supported version targets for v0.1:

- `nano >= 9.0 < 10`
- `htop >= 3.4.1 < 4`

Regression targets after primary support is green:

- `nano` 8.x
- `htop` 3.3.x and 3.4.x point releases

## Scope

### In Scope

- Linux and macOS
- local and remote session control via the same protocol
- browser/Electron-friendly reference tooling
- raw screen snapshots and patches
- premium `nano` and `htop` drivers
- recorder and inspector
- replay-based testing and CI conformance

### Out of Scope

- Windows / ConPTY
- arbitrary GUI terminal scraping as a primary backend
- a universal semantic model for all terminal apps
- AI planner logic in the core
- pixel streaming as the source of truth
- Python or Rust SDKs in v0.1

## Monorepo Layout

```text
apps/
  inspector-web/
  demo-web/
  demo-electron/

packages/
  protocol/
  host/
  sdk/
  driver-kit/
  recorder/
  testing/
  cli/
  fixtures/

premium/
  driver-nano/
  driver-htop/

docs/
  architecture/
  protocol/
  drivers/
```

Tooling:

- `pnpm`
- `turbo`
- `tsc --build`
- `tsup`
- `vitest`
- `eslint`
- `prettier`
- `changesets`

## Package Responsibilities

### `packages/protocol`

Owns:

- transport envelope
- session lifecycle messages
- input messages
- snapshot and patch messages
- query and action messages
- semantic event messages
- recording event schema
- capability schema

Constraints:

- no app-specific logic
- all schemas versioned
- all runtime-validated with `zod`

### `packages/host`

Owns:

- PTY spawn, resize, close, signals
- headless terminal instance and canonical screen state
- screen revisioning and patch generation
- driver runtime and driver state
- in-process transport
- WebSocket transport
- session registry
- recording and replay plumbing

This is the authoritative source of truth.

### `packages/sdk`

Owns:

- public TypeScript API
- local and remote transports behind one interface
- generic screen access
- generic locators and waits
- driver registration and typed driver access

### `packages/driver-kit`

Owns shared driver utilities:

- screen helpers
- text/style/box extraction
- region segmentation
- selection detection
- parser helpers
- state-machine utilities
- driver fixture harness
- common postcondition helpers

### `packages/recorder`

Owns:

- session recording
- fixture capture
- replay bundles
- optional later authoring helpers for driver playbooks

### `packages/testing`

Owns:

- test harnesses
- child-process fixtures
- platform checks
- fake tool shims for optional app features

### `packages/cli`

Owns developer and operator commands:

- start session
- inspect session
- dump screen
- send key/text/mouse
- run action
- record
- replay
- driver inspect

### `premium/driver-nano`

Owns:

- managed launch profile
- capability detection
- mode parsing
- semantic elements
- typed actions
- fixtures and conformance tests

### `premium/driver-htop`

Owns:

- managed launch profile
- managed `htoprc`
- capability detection
- subscreen parsing
- semantic elements
- typed actions
- fixtures and conformance tests

## Detailed Module Layout

### `packages/protocol/src`

```text
index.ts
envelope.ts
hello.ts
session.ts
input.ts
screen.ts
query.ts
action.ts
events.ts
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
replay.ts
temp-env.ts
transports/
  in-process.ts
  ws-server.ts
launchers/
  nano.ts
  htop.ts
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
lists.ts
selection.ts
regions.ts
modes.ts
actions.ts
postconditions.ts
fixtures.ts
```

### `premium/driver-nano/src`

```text
index.ts
driver.ts
state.ts
capabilities.ts
modes.ts
launch-profile.ts
parse-layout.ts
parse-title.ts
parse-status.ts
parse-help.ts
parse-prompt.ts
parse-browser.ts
locators.ts
actions.ts
fixtures.ts
```

### `premium/driver-htop/src`

```text
index.ts
driver.ts
state.ts
capabilities.ts
modes.ts
launch-profile.ts
htoprc.ts
parse-tabs.ts
parse-meters.ts
parse-process-table.ts
parse-function-bar.ts
parse-modals.ts
parse-setup.ts
parse-side-screens.ts
locators.ts
actions.ts
fixtures.ts
```

## Host Model

### Session Lifecycle

1. client starts or attaches to a session
2. host spawns a PTY or restores a persisted session
3. host feeds PTY bytes into `@xterm/headless`
4. host updates canonical screen state
5. host updates driver state
6. host emits screen patches and semantic events
7. client sends raw input or driver actions back through the host

### Canonical Screen State

The canonical model must be app-agnostic.

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

### Patch Model

Use:

- full snapshot on connect or explicit request
- dirty-row patches by default
- cell-level optimization later

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

### Generic Heuristic Layer

The OSS core should provide generic heuristics for non-premium use:

- text matching
- regex matching
- region clustering
- table row segmentation
- selected-row inference
- reverse-video and help-bar detection
- border and boxed-region detection

These heuristics are fallback only. They are never the premium source of truth.

## Protocol

Transport:

- in-process first
- WebSocket first-class

Protocol envelope:

```ts
type Envelope<T extends string, P> = {
  v: 1
  id?: string
  sessionId?: string
  type: T
  payload: P
}
```

### Client-to-Host

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

### Host-to-Client

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

### Example Action

```json
{
  "v": 1,
  "id": "req_42",
  "sessionId": "sess_1",
  "type": "action.invoke",
  "payload": {
    "driver": "nano",
    "name": "saveAs",
    "args": { "path": "/tmp/out.txt" }
  }
}
```

## Public SDK Shape

The SDK should feel Playwright-like without lying about terminals being DOMs.

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
const matches = await session.locator.text('Write Out').all()

const nano = await session.use(nanoDriver)
await nano.insert('hello')
await nano.save()
```

### Element Model

```ts
type Element = {
  id: string
  role: string
  name?: string
  text?: string
  origin: 'driver' | 'heuristic'
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

### Waits

- `waitForText`
- `waitForChange`
- `waitForStable`
- `waitForElement`
- `waitForMode`

## Driver Contract

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

Driver rules:

- drivers cannot own the PTY
- drivers cannot mutate session state directly
- drivers can only interact through `DriverIO`
- driver actions should prefer canonical key sequences over synthetic mouse input

## Managed Launch Policy

Premium drivers must launch with isolated, deterministic environments.

Common defaults:

- `TERM=xterm-256color`
- `LC_ALL=C.UTF-8` when available, else deterministic `C`
- isolated temp `HOME`
- fixed rows/cols for conformance
- explicit helper-tool detection

The host must support:

- per-session temp directories
- allowlisted managed launches
- explicit argv building without shell interpolation

## Premium Driver: `nano`

### Support Target

- GNU `nano` 9.x
- Linux and macOS
- managed sessions only for full guarantees

### Managed Launch Profile

Default:

- command: `nano`
- args:
  - `--ignorercfiles`
  - `--mouse`
- env:
  - deterministic locale
  - isolated `HOME`

Controlled test variants:

- `--multibuffer`
- `--linenumbers`
- `--positionlog`
- `--softwrap`
- `--restricted`

Do not use invalid boolean-style flags such as `--restricted=false`.

### Capability Detection

Report:

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
- `anchors`
- `macros`

For `speller`, `formatter`, and `linter`, detect both build/runtime availability and configured helper availability.

### Top-Level Regions

- `titleBar`
- `editViewport`
- `statusBar`
- `helpLines`

### Mode State Machine

The driver must explicitly model:

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

Mode classification sources:

- status-bar prompt text
- bottom shortcut lines
- cursor position
- title-bar content
- known prompt toggles

### Semantic State

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

### Elements

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

### Public Premium API

Keep the detailed facade style from `PLAN_COLGATE.md`, but route everything through the generic session/driver system.

Key methods:

- `insert(text)`
- `move(direction, count?)`
- `gotoLine(line, column?)`
- `save()`
- `saveAs(path, opts?)`
- `openFile(path, opts?)`
- `readFile(path, opts?)`
- `search(query, opts?)`
- `replace(find, with, opts?)`
- `toggleMark()`
- `copySelection()`
- `cutSelection()`
- `paste()`
- `undo()`
- `redo()`
- `openHelp()`
- `closeHelp()`
- `openBrowser()`
- `browserSelect(pathOrIndex)`
- `executeCommand(command, opts?)`
- `runSpeller()`
- `runFormatter()`
- `jumpNextLint()`
- `jumpPrevLint()`
- `recordMacro()`
- `playMacro()`
- `placeAnchor()`
- `jumpAnchor(direction)`
- `switchBuffer(direction | index)`
- `exit(opts?)`

### Coverage Standard

To claim full premium coverage, the driver must cover:

- modeless editing
- search and replace
- mark/cut/copy/paste
- help viewer
- write-out and read-file flows
- file browser
- execute-command flow
- spell/linter/formatter flows when available
- multibuffer flows
- anchors
- macros
- restricted-mode capability downgrades

### `nano` Testing

Unit:

- prompt parsing
- title/status/help parsing
- mode classification
- browser parsing
- shortcut parsing

Integration:

- open/save/search/replace
- mark/cut/paste
- browser navigation
- execute command
- help viewer
- multibuffer switching
- spell/linter/formatter when configured

Golden fixtures:

- empty buffer
- modified buffer
- search prompt
- replace prompt
- help viewer
- browser
- execute mode
- linter mode

## Premium Driver: `htop`

### Support Target

- `htop` 3.4.x
- Linux and macOS
- managed sessions only for full guarantees

### Managed Launch Profile

Use isolated config and generated `htoprc`.

Requirements:

- fixed geometry for tests, default `140x45`
- isolated `XDG_CONFIG_HOME`
- known field order
- known color scheme
- known meter configuration
- function bar visible
- mouse enabled unless a test explicitly disables it

Profiles:

- `common`
- `full`

The `full` profile exists for feature coverage, not for ordinary user defaults.

### Capability Detection

Report:

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

Capability inputs:

- version string
- platform
- managed config
- presence of tools like `strace` and `lsof`
- visible runtime screens and menus

Do not depend on undocumented commands like `htop --show-options` unless validated at implementation time.

### Surface Model

The driver must treat `htop` as a family of screens:

- main process view
- help screen
- setup root
- setup subpanels
- signal menu
- affinity screen
- open files screen
- locks screen
- command line screen
- strace screen
- environment/info screens where available

### Main State

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

### Elements

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

### Public Premium API

Adopt the richer typed facade shape from `PLAN_COLGATE.md`, corrected for current `htop` reality.

Main methods:

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
- `expandSubtree()`
- `collapseSubtree()`
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

### Coverage Standard

To claim full premium coverage, the driver must support all visible interactive features in supported builds, including:

- process list navigation
- screen tabs when enabled
- tagging
- search and filter
- tree mode and subtree operations
- sort selection and inversion
- follow mode
- thread/process visibility toggles
- path and merge toggles
- signal menu
- niceness changes
- autogroup priority changes where available
- CPU affinity
- setup flows
- help screen
- optional side screens such as command line, locks, open files, and strace

### `htop` Implementation Strategy

Use subscreen parsers:

- `mainViewParser`
- `setupViewParser`
- `helpViewParser`
- `signalMenuParser`
- `affinityViewParser`
- `infoViewParser`

Do not try to make every meter semantic on day one.

Instead:

- parse all visible meter regions
- strongly structure known meters from the managed profile
- leave unknown meters as generic labeled regions

### `htop` Testing

Unit:

- table header parsing
- process row parsing
- function bar parsing
- modal parsing
- setup parsing
- meter parsing

Integration:

- search and filter
- sort changes
- tree mode
- tagging
- kill and renice on disposable child processes
- affinity where available
- help and setup
- open files and strace when helpers exist

Golden fixtures:

- main idle
- filtered
- search active
- tree expanded and collapsed
- setup
- signal menu
- affinity
- strace
- help

### Important `htop` Corrections

Implementation must reflect current docs:

- current primary support target is `3.4.x`, not `3.5.x`
- `refresh()` should map to the documented refresh key
- delay-related tests must honor the documented valid range, not invented values

## Recorder and Replay

Recorder is part of v0.1.

Record:

- raw PTY output
- input events
- resize events
- snapshot checkpoints
- semantic events

Replay modes:

- raw VT replay
- state replay
- semantic replay

Use replay for:

- tests
- bug reports
- fixture generation
- regression debugging

The recorder may later emit internal authoring artifacts for driver playbooks, but that is not required for v0.1 release.

## Inspector

The inspector is a core debugging tool, not optional polish.

Features:

- live xterm.js rendering
- screen revision display
- current driver mode
- semantic state pane
- raw event pane
- element inspector overlay
- action console
- recording controls
- replay mode

## Testing and CI

### CI Matrix

- Linux latest
- macOS latest
- Node 22 and 24

### Test Layers

- lint and typecheck
- unit tests
- integration tests
- replay tests
- conformance tests
- inspector smoke tests

### Conformance Rules

Conformance must run against real binaries.

For Linux:

- use containers where practical

For macOS:

- run native GitHub Actions jobs or equivalent native runners

Do not pretend Docker-only Linux conformance proves Darwin behavior.

### Test Dependencies

- `nano`
- `htop`
- `lsof`
- `strace` on Linux
- helper stubs or real tools for spell/formatter/linter flows in `nano`

## Security and Isolation

### v0.1

- trusted-operator model
- session IDs
- per-session temp directories
- no shell interpolation
- explicit allowlist for managed app launches

### Later

- auth tokens
- multi-user access control
- observer/controller roles
- audit logging

## Licensing and Legal

`nano` and `htop` are GPL projects.

Implementation rules:

- do not copy upstream source into premium drivers
- do not vendor UI text or source fragments casually
- keep driver logic clean-room and observation-based
- review license posture before publishing premium modules under any non-matching business model

## Delivery Phases

### Phase 0: Scaffold

Deliver:

- workspace
- TS config
- lint/test/build scripts
- protocol skeleton

Done when:

- fresh install builds cleanly
- CI is green on scaffold

### Phase 1: Host Core

Deliver:

- PTY spawn/resize/close
- headless terminal binding
- snapshots
- row patches
- in-process transport
- WebSocket transport

Done when:

- a shell session can be controlled locally and remotely

### Phase 2: SDK Skeleton

Deliver:

- `Session`
- `Screen`
- `Keyboard`
- `Mouse`
- `Locator`
- wait helpers

Done when:

- generic shell tests pass

### Phase 3: Driver Kit, Recorder, Inspector

Deliver:

- driver contract
- fixture harness
- recorder
- inspector
- semantic event channel

Done when:

- a toy driver works and can be debugged live in the inspector

### Phase 4: `nano` Alpha

Deliver:

- launch profile
- mode parser
- layout parser
- first editor/help/browser flows
- initial fixtures

Done when:

- open, type, save, search, help, browser flows are stable

### Phase 5: `nano` Full Coverage

Deliver:

- advanced prompts
- replace flows
- multibuffer
- execute, spell, formatter, linter
- macros and anchors

Done when:

- `nano` supported-runtime matrix is green

### Phase 6: `htop` Alpha

Deliver:

- managed `htoprc`
- main process view parser
- search/filter
- sort
- kill signal flow
- initial fixtures

Done when:

- basic `htop` navigation and process actions are stable

### Phase 7: `htop` Full Coverage

Deliver:

- setup flows
- help
- tree operations
- tags
- affinity
- side screens

Done when:

- `htop` supported-runtime matrix is green

### Phase 8: Hardening and Release

Deliver:

- reconnect handling
- replay bundles
- docs
- examples
- release automation

Done when:

- v0.1 is releasable

## First Six Sprints

### Sprint 1

- scaffold workspace
- implement `packages/protocol`
- implement `packages/host` shell smoke path

### Sprint 2

- stable snapshot extraction
- dirty-row patch generation
- in-process transport

### Sprint 3

- WebSocket transport
- `packages/sdk`
- generic locators and waits

### Sprint 4

- inspector alpha
- recorder alpha
- driver contract and toy driver

### Sprint 5

- `nano` layout and mode parsing
- `nano` core actions
- first fixtures

### Sprint 6

- `nano` search/save/browser/help coverage
- start `htoprc` generator and `htop` main view parser

## Timeline

Realistic estimate:

- solo: 8 to 10 months
- two engineers: 5 to 7 months

Rough split:

- core host/protocol/sdk/tooling: 10 to 12 weeks
- `nano` premium: 6 to 8 weeks
- `htop` premium: 8 to 10 weeks
- hardening/docs/release: 3 to 4 weeks

## Biggest Risks

### App variability

Mitigation:

- managed sessions
- isolated config
- capability reporting
- pinned version matrix

### `htop` volatility

Mitigation:

- authoritative screen state
- subscreen parsers
- revision-based waits
- stable managed config

### Optional helper tools

Mitigation:

- runtime capability detection
- separate required vs optional conformance jobs

### Driver race conditions

Mitigation:

- postcondition-driven actions
- `waitForStable`
- revision-aware action sequencing

### Scope creep

Mitigation:

- no Windows
- no arbitrary terminal attach as a premium guarantee
- no public map-runtime dependency in v0.1

## Immediate Next Step

Start with infrastructure, not app parsing.

The next coding step should be:

1. scaffold the monorepo
2. implement `packages/protocol`
3. implement `packages/host` with shell smoke tests
4. build the inspector alpha
5. only then start `nano`

Do not start by writing `nano` or `htop` feature code before the host and inspector exist.

## References

- `node-pty`: https://github.com/microsoft/node-pty
- `xterm.js` and `@xterm/headless`: https://github.com/xtermjs/xterm.js/
- GNU `nano` manual 9.0: https://www.nano-editor.org/dist/latest/nano.html
- `htop` releases: https://github.com/htop-dev/htop/releases
- `htop` man page source: https://raw.githubusercontent.com/htop-dev/htop/main/htop.1.in
- `htop` repository: https://github.com/htop-dev/htop
