# Plan — Project Colgate

> **Colgate** is the internal codename for a TypeScript-first terminal-use SDK + premium modules covering the full feature surface of `nano 9.x` and `htop 3.5.x`. Target audience: AI engineers and agentic engineers building software on top of a deterministic, programmable interface to console applications.

---

## 1. Context

### Why this project exists
Agentic engineers need a *library* — not an MCP server, not a CLI wrapper — for driving console applications deterministically. The browser world has Playwright + browser-use; the terminal world has scrappy pieces (pexpect, tmate, termwright, pilotty) but no coherent SDK with:
- A production-grade PTY + VT state engine
- A typed, composable API that works at multiple abstraction levels
- A map-driven state machine runtime so apps become programmable state graphs
- "Premium modules" that expose every feature of specific apps as typed methods
- Full TypeScript end-to-end (core, runtime, maps, facades, tooling)

### Goal of v0.1
Ship a cohesive monorepo of npm packages that together deliver:
1. A **core SDK** — spawn a program in a PTY, stream state, send keys, query the grid, wait on conditions, handle errors.
2. A **map runtime** — declarative app-state-machine execution with fingerprinting, pathfinding, and transition validation.
3. **Two premium modules** covering **every feature** of `nano 9.x` and `htop 3.5.x`, exposing each as a typed method on a facade class.
4. **Developer tooling** — a recorder to capture sessions into map drafts, an inspector for live fingerprint/element devtools.
5. **Testing infrastructure** — unit tests, replay fixtures, and conformance tests against real binaries in CI.

### Intended outcome
An AI engineer (e.g. Peter Steinberger archetype) can:
```ts
import { Terminal } from '@colgate/core';
import { Nano }     from '@colgate/nano';
import { Htop }     from '@colgate/htop';
```
…and deterministically automate nano/htop inside their own agent loops, test harnesses, or desktop apps, with every feature of each app reachable through typed methods.

### Non-goals (v0.1)
- MCP server
- Remote/daemon/collaborative-viewing architecture (post-v0.1)
- Python/Rust/Go SDK bindings (post-v0.1)
- LLM-driven navigation or auto-map-discovery
- Windows / ConPTY support
- A terminal emulator (we reuse `@xterm/headless`)
- More than two premium modules

---

## 2. Decisions & Assumptions

These are committed choices for the v0.1 plan. Change here, not silently during execution.

| Decision | Value | Rationale |
|---|---|---|
| Language | TypeScript 5.5+, strict mode, ESM-only | User directive; matches state-engine ecosystem |
| Runtime | Node.js ≥ 22 LTS (dev on 24) | Modern ESM, stable `node-pty` support |
| Package manager | **pnpm** 9.x | Best-in-class workspaces; deterministic installs |
| Monorepo tool | pnpm workspaces + Turborepo (optional for caching) | Standard 2026 setup |
| Build | `tsc --build` (project refs) + `tsup` where bundling needed | Simple, predictable |
| Testing | `vitest` | Fast, ESM-native, good TS DX |
| PTY | `node-pty` (Microsoft C++ addon) | VS Code-grade |
| VT state engine | `@xterm/headless` + `@xterm/addon-serialize`, `@xterm/addon-unicode11` | Production-grade, same parser as VS Code |
| Schema validation | `zod` | Single source for runtime + types (`z.infer`) |
| Map authoring format | **TypeScript modules** (not JSON) | Honors "TS end-to-end"; full type safety + composability |
| License | MIT | Placeholder; override at publish time |
| Scope | `@colgate/*` | Placeholder; rename before npm publish |
| Target nano | **9.0** (primary), regression tested against 7.2 / 8.0 | System binary is 9.0; prior versions share most surface |
| Target htop | **3.5.0** (primary), regression tested against 3.3 / 3.4 | System binary is 3.5.0 |
| Platforms v0.1 | Linux (x86_64, arm64), macOS (x86_64, arm64) | PTY parity; Windows deferred |
| Terminal dims | Default 120×40; parameterizable per session | Fixture determinism |
| Locale pinning | `LANG=C`, `LC_ALL=C`, `TZ=UTC`, `TERM=xterm-256color` | Deterministic fingerprints |
| Code style | Prettier, ESLint (typescript-eslint strict), `.editorconfig` | Standard |
| Git hooks | simple-git-hooks + lint-staged | Low-ceremony |
| Changelog / versioning | `changesets` | Per-package semver |
| CI | GitHub Actions | Ubuntu latest + macOS latest, matrix on Node 22 / 24 |

### Timeline reality check
"**Every feature** of nano and htop" is a real commitment. Honest estimates:

| Work | Solo | Team of 2 |
|---|---|---|
| Core + Map runtime + tooling | 4 months | 2.5 months |
| Nano premium module (full coverage) | 3 months | 2 months |
| Htop premium module (full coverage) | 3 months | 2 months |
| Cross-cutting: docs, release, hardening | 2 months | 1.5 months |
| **Total (serial)** | **~12 months** | **~8 months** |

Parallelizable: nano and htop modules can proceed once core is stable (~month 4 solo / month 2.5 team). Realistic calendar: **9–12 months solo** or **6–8 months with a second dedicated engineer**.

---

## 3. Repository Layout

Final target location: `/home/stk/workspace/engineering/adjutant/terminal-use/` (currently empty except `.codex`).

```
terminal-use/
├── .changeset/                      # changesets state
├── .github/
│   └── workflows/
│       ├── ci.yml                   # matrix CI
│       ├── conformance.yml          # Docker-per-app-version tests (weekly + on release)
│       └── release.yml              # tag-triggered npm publish
├── .editorconfig
├── .nvmrc                           # 22
├── .prettierrc
├── eslint.config.js
├── package.json                     # root: scripts, devDeps, pnpm-workspaces
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json               # strict, ESNext, moduleResolution bundler
├── turbo.json                       # optional: build caching
├── README.md                        # project intro + quick start
├── LICENSE                          # MIT
├── CONTRIBUTING.md
├── PLAN_COLGATE.md                  # copy of this plan; kept in sync
├── docs/                            # vitepress site (v0.1 ships bare-bones)
│   └── …
├── examples/                        # end-to-end runnable examples
│   ├── nano-basic.ts
│   ├── htop-kill-cpu-hog.ts
│   ├── custom-agent-loop.ts
│   └── embed-in-tauri/
├── fixtures/                        # shared recorded .cast files for replay tests
│   ├── nano/9.0/
│   ├── htop/3.5.0/
│   └── schema.md
└── packages/
    ├── core/                        # @colgate/core
    ├── map/                         # @colgate/map
    ├── nano/                        # @colgate/nano
    ├── htop/                        # @colgate/htop
    ├── recorder/                    # @colgate/recorder
    ├── inspector/                   # @colgate/inspector
    ├── testing/                     # @colgate/testing
    └── cli/                         # @colgate/cli (single entrypoint: record, inspect, test, run)
```

Every package has identical shape:
```
packages/<name>/
├── src/
│   ├── index.ts
│   └── …
├── test/
│   └── *.test.ts
├── package.json
├── tsconfig.json                    # extends ../../tsconfig.base.json, with composite:true
├── vitest.config.ts
├── README.md
└── CHANGELOG.md                     # auto-managed by changesets
```

---

## 4. Package: `@colgate/core`

**Responsibility:** Own the PTY lifecycle and the VT state engine. Provide typed input, pure-data snapshots, key encoding, wait primitives, and a rich event stream. Know nothing about specific apps.

**Dependencies:** `node-pty`, `@xterm/headless`, `@xterm/addon-serialize`, `@xterm/addon-unicode11`.

### 4.1 Public API — surface-level signatures

```ts
// packages/core/src/index.ts

export { Terminal } from './terminal';
export { Session } from './session';       // thin wrapper around Terminal with logging hooks
export * as keys from './keys';
export * from './snapshot';
export * from './waits';
export * from './errors';
export * as events from './events';
```

### 4.2 `Terminal` class

```ts
// packages/core/src/terminal.ts

export interface SpawnOpts {
  argv: string[];
  cwd?: string;
  env?: Record<string, string>;           // merged on top of sanitized defaults
  cols?: number;                          // default 120
  rows?: number;                          // default 40
  encoding?: 'utf-8' | 'latin1';          // default 'utf-8'
  scrollback?: number;                    // default 10_000
  /** Override the defaults { LANG: 'C', LC_ALL: 'C', TZ: 'UTC', TERM: 'xterm-256color' } */
  deterministicEnv?: boolean;             // default true
}

export class Terminal {
  static async spawn(opts: SpawnOpts): Promise<Terminal>;

  // --- Identity ---
  readonly pid: number;
  readonly cols: number;
  readonly rows: number;

  // --- Raw I/O ---
  write(bytes: Uint8Array | string): Promise<void>;
  read(): AsyncIterable<Uint8Array>;       // AsyncIterable of chunks the terminal observed

  // --- Typed input ---
  type(text: string): Promise<void>;       // literal UTF-8 chars
  key(name: KeyName | KeyName[]): Promise<void>;  // "F10", "Ctrl+X", "Up", "Meta+R"
  paste(text: string): Promise<void>;      // emits bracketed-paste markers
  resize(cols: number, rows: number): Promise<void>;

  // --- Snapshots (pure data) ---
  snapshot(): Snapshot;
  line(index: number): LineView;           // negative indexing from last row
  region(spec: RegionSpec): RegionView;
  cursor(): CursorPos;
  find(needle: string | RegExp, in?: RegionSpec): Match | null;
  findAll(needle: string | RegExp, in?: RegionSpec): Match[];

  // --- Waits (all take WaitOpts; throw WaitTimeoutError) ---
  waitForText(needle: string | RegExp, opts?: WaitOpts): Promise<Match>;
  waitForStable(ms?: number, opts?: WaitOpts): Promise<void>;   // no bytes for `ms`
  waitForIdle(ms?: number, opts?: WaitOpts): Promise<void>;     // alias, semantic
  waitForCursor(spec: Partial<CursorPos>, opts?: WaitOpts): Promise<void>;
  waitForExit(opts?: WaitOpts): Promise<ExitInfo>;
  waitForPredicate<T>(predicate: (t: Terminal) => T | null, opts?: WaitOpts): Promise<T>;

  // --- Events ---
  on(event: 'bytes',    cb: (chunk: Uint8Array) => void): Unsubscribe;
  on(event: 'screen',   cb: (diff: ScreenDiff) => void): Unsubscribe;
  on(event: 'cursor',   cb: (pos: CursorPos) => void): Unsubscribe;
  on(event: 'title',    cb: (title: string) => void): Unsubscribe;
  on(event: 'bell',     cb: () => void): Unsubscribe;
  on(event: 'exit',     cb: (info: ExitInfo) => void): Unsubscribe;

  // --- Lifecycle ---
  kill(signal?: NodeJS.Signals): Promise<void>;  // default SIGTERM, escalates to SIGKILL after 500ms
  dispose(): Promise<void>;                      // closes PTY, parser, listeners
  readonly disposed: boolean;
}
```

### 4.3 Snapshot types

```ts
// packages/core/src/snapshot.ts

export interface Snapshot {
  readonly cols: number;
  readonly rows: number;
  readonly cells: ReadonlyArray<ReadonlyArray<Cell>>; // cells[row][col]
  readonly cursor: CursorPos;
  readonly altScreen: boolean;
  readonly title: string | null;
  /** Plain text of the visible area, rows joined by \n, trailing spaces trimmed. */
  text(): string;
  /** ANSI-preserving dump of the visible area (for debugging / fixtures). */
  ansi(): string;
  /** Structured hash for fingerprint stability checks. */
  hash(): string;
}

export interface Cell {
  readonly ch: string;                // one codepoint; '' for wide-char continuation cells
  readonly fg: Color;
  readonly bg: Color;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly inverse: boolean;
  readonly strikethrough: boolean;
  readonly hyperlink?: { id: string; uri: string };
}

export type Color =
  | { kind: 'default' }
  | { kind: 'palette'; index: number }
  | { kind: 'rgb'; r: number; g: number; b: number };

export interface CursorPos { row: number; col: number; visible: boolean; shape: CursorShape }
export type CursorShape = 'block' | 'underline' | 'bar';

export interface RegionSpec {
  rows?: [number, number];   // inclusive, negatives allowed
  cols?: [number, number];
}
export interface RegionView {
  readonly spec: RegionSpec;
  readonly cells: ReadonlyArray<ReadonlyArray<Cell>>;
  text(): string;
  ansi(): string;
}

export interface LineView {
  readonly index: number;    // resolved (non-negative)
  readonly cells: ReadonlyArray<Cell>;
  text(): string;
}

export interface Match {
  readonly needle: string | RegExp;
  readonly row: number;
  readonly col: number;
  readonly length: number;
  readonly text: string;
  readonly groups?: Record<string, string>;
}

export interface ScreenDiff {
  readonly before: string;   // hash
  readonly after: string;    // hash
  readonly changedRows: readonly number[];
  readonly elapsedMs: number;
}
```

### 4.4 Key encoder

```ts
// packages/core/src/keys.ts

export type KeyName = string; // format below

/**
 * Syntax:
 *   Single token:   "a"  "F10"  "Enter"  "Up"  "Space"
 *   Modified:       "Ctrl+X"  "Meta+R"  "Ctrl+Shift+End"
 *   Composite:      ["Ctrl+X", "Ctrl+C"]  for key chords
 *
 * Named keys:
 *   Enter, Esc, Tab, Backspace, Delete, Insert, Home, End, PgUp, PgDn,
 *   Up, Down, Left, Right, Space, F1..F24
 *
 * Modifiers:  Ctrl, Shift, Meta (= Alt)
 */
export function encode(key: KeyName, opts?: { backspace?: 'del' | 'bs' }): Uint8Array;
export function encodeText(s: string): Uint8Array;

// Internal table-driven. Pins TERM=xterm-256color behavior.
// Sources: XTerm Control Sequences, vt100.net. No regex parsing of key names.
```

**File:** `packages/core/src/keys.ts` — pure, unit-tested in isolation. Table lookup with exhaustive test vectors. No regex in hot path.

### 4.5 Waits

```ts
// packages/core/src/waits.ts

export interface WaitOpts {
  timeoutMs?: number;     // default 3000
  pollMs?: number;        // default 15
  signal?: AbortSignal;
  message?: string;       // included in error
}
```

Implementation notes:
- `waitForStable` buffers `bytes` events; resolves when Δt since last byte ≥ `ms`. Resets on every incoming chunk.
- `waitForText` runs a regex/substring check on each `screen` event; cheap because `@xterm/headless` exposes changed-line ranges.
- All waits respect `AbortSignal` for cancellation.

### 4.6 Errors

```ts
// packages/core/src/errors.ts

export abstract class ColgateError extends Error {
  abstract readonly kind: string;
  readonly context: Record<string, unknown>;
}

export class WaitTimeoutError extends ColgateError {
  readonly kind = 'WaitTimeout';
  constructor(
    readonly what: string,
    readonly timeoutMs: number,
    readonly snapshot: Snapshot,
  );
}

export class UnexpectedScreenError extends ColgateError {
  readonly kind = 'UnexpectedScreen';
  constructor(
    readonly expectedScreenId: string,
    readonly observedScreenId: string | null,
    readonly snapshot: Snapshot,
  );
}

export class ProcessExitedError extends ColgateError {
  readonly kind = 'ProcessExited';
  constructor(readonly exitCode: number, readonly signal: string | null);
}

export class InvalidKeyError extends ColgateError {
  readonly kind = 'InvalidKey';
  constructor(readonly key: string);
}

export class PtySpawnError extends ColgateError {
  readonly kind = 'PtySpawn';
  constructor(readonly argv: string[], readonly cause: unknown);
}
```

Every error includes enough context to debug from a log line. `toJSON()` serializes cleanly.

### 4.7 File-by-file layout

```
packages/core/src/
├── index.ts              # re-exports
├── terminal.ts           # Terminal class
├── session.ts            # optional Session wrapper for logging/tracing
├── pty.ts                # wraps node-pty; handles deterministicEnv, resize, signals
├── parser.ts             # wraps @xterm/headless; exposes change events
├── snapshot.ts           # Snapshot/LineView/RegionView/Match types + impls
├── keys.ts               # key encoder table + encode()/encodeText()
├── waits.ts              # waitFor* primitives
├── events.ts             # typed EventEmitter implementation
├── errors.ts             # typed error hierarchy
├── util/
│   ├── abort.ts
│   ├── hash.ts           # stable hash for Snapshot
│   └── time.ts
└── internal/
    └── color.ts          # Color decoding from xterm cell attrs
```

### 4.8 Test plan for core

Unit:
- `keys.test.ts` — ~200 test vectors covering every named key × modifier combo; golden byte-sequence comparison.
- `snapshot.test.ts` — construct fixture grids, assert `.text()`, `.ansi()`, `.hash()`, `.region()` semantics including negative indexing.
- `waits.test.ts` — fake Terminal with scripted byte/screen events; assert timeouts, AbortSignal, polling intervals.
- `errors.test.ts` — JSON round-trips, `instanceof` behavior, `.context` presence.

Integration (uses real `node-pty`):
- `integration/bash.test.ts` — spawn `bash -c 'echo hello; exit'`, assert output, waitForExit.
- `integration/resize.test.ts` — resize mid-session; assert SIGWINCH propagates.
- `integration/alt-screen.test.ts` — spawn `less /etc/passwd`, assert alt-screen flag toggles.
- `integration/unicode.test.ts` — emit CJK + wide chars; assert cell width handling.

---

## 5. Package: `@colgate/map`

**Responsibility:** Declare AppMaps (screen graphs, fingerprints, transitions) as TypeScript modules; load them; execute transitions deterministically; pathfind from current screen to a target screen; validate postconditions.

**Depends on:** `@colgate/core`, `zod`.

### 5.1 Schema (zod + inferred TS types)

```ts
// packages/map/src/schema.ts
import { z } from 'zod';

export const RegionSpec = z.object({
  rows: z.tuple([z.number().int(), z.number().int()]).optional(),
  cols: z.tuple([z.number().int(), z.number().int()]).optional(),
});

export const Assertion = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text_at'),       row: z.number().int(), col: z.number().int().optional(), text: z.string() }),
  z.object({ kind: z.literal('text_in_row'),   row: z.number().int(), text: z.string() }),
  z.object({ kind: z.literal('text_anywhere'), text: z.string() }),
  z.object({ kind: z.literal('regex_in_row'),  row: z.number().int(), pattern: z.string(), flags: z.string().optional() }),
  z.object({ kind: z.literal('cursor_in'),     region: RegionSpec }),
  z.object({ kind: z.literal('cell_attr'),     row: z.number().int(), col: z.number().int(),
             attr: z.enum(['bold','italic','underline','inverse','strikethrough']) }),
  z.object({ kind: z.literal('title'),         text: z.string().or(z.instanceof(RegExp)) }),
  z.object({ kind: z.literal('alt_screen'),    value: z.boolean() }),
  z.object({ kind: z.literal('not'),           inner: z.lazy(() => Assertion) }),
  z.object({ kind: z.literal('any_of'),        items: z.lazy(() => z.array(Assertion)) }),
  z.object({ kind: z.literal('all_of'),        items: z.lazy(() => z.array(Assertion)) }),
]);
export type Assertion = z.infer<typeof Assertion>;

export const ElementDef = z.object({
  region: RegionSpec,
  kind: z.enum(['label','button','input','list','table','text']).optional(),
  description: z.string().optional(),
});

export const Screen = z.object({
  id: z.string().min(1),
  fingerprint: z.array(Assertion).min(1),
  stableAfterMs: z.number().int().optional().default(50),
  volatileRegions: z.array(RegionSpec).optional(),
  elements: z.record(z.string(), ElementDef).optional(),
  description: z.string().optional(),
});

export const Parameter = z.object({
  name: z.string(),
  kind: z.enum(['string','number','boolean','enum']),
  enumValues: z.array(z.string()).optional(),
  default: z.unknown().optional(),
});

export const Step = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('key'),         value: z.string() }),          // key name
  z.object({ kind: z.literal('text'),        value: z.string() }),          // supports ${param}
  z.object({ kind: z.literal('erase_line') }),                              // Ctrl+U for prompts
  z.object({ kind: z.literal('clear_to_eol') }),
  z.object({ kind: z.literal('wait_ms'),     value: z.number().int().positive() }),
  z.object({ kind: z.literal('wait_stable'), ms: z.number().int().optional() }),
]);

export const Transition = z.object({
  from: z.string(),
  to: z.string().or(z.array(z.string()).min(1)),   // may land on one of several
  action: z.string(),
  sequence: z.array(Step).min(1),
  parameters: z.array(Parameter).optional(),
  preconditions: z.array(Assertion).optional(),
  postvalidators: z.array(Assertion).optional(),
  timeoutMs: z.number().int().positive().optional().default(1500),
  idempotent: z.boolean().optional().default(false),
  description: z.string().optional(),
});

export const AppMeta = z.object({
  name: z.string(),
  versions: z.string(),                       // semver range
  launch: z.object({
    argv: z.array(z.string()),                // supports ${filename?} etc.
    envOverrides: z.record(z.string(), z.string()).optional(),
    defaultCols: z.number().int().optional(),
    defaultRows: z.number().int().optional(),
  }),
});

export const AppMap = z.object({
  app: AppMeta,
  screens: z.array(Screen).min(1),
  transitions: z.array(Transition),
});
export type AppMap = z.infer<typeof AppMap>;
```

### 5.2 Authoring helpers (TS, not JSON)

```ts
// packages/map/src/define.ts

export function defineMap<S extends string, A extends string>(
  spec: StronglyTypedAppMap<S, A>,
): AppMap & { __screenIds: S; __actionIds: A };

// Helpers that reduce boilerplate and preserve literal types:
export function screen<S extends string>(
  id: S,
  fingerprint: Assertion[],
  opts?: Omit<Screen, 'id' | 'fingerprint'>,
): Screen & { __id: S };

export function transition<F extends string, T extends string, A extends string>(
  from: F, to: T | T[], action: A, sequence: Step[],
  opts?: Omit<Transition, 'from' | 'to' | 'action' | 'sequence'>,
): Transition & { __from: F; __to: T; __action: A };

export const fp = {
  textAt:      (row: number, col: number, text: string): Assertion => ({ kind: 'text_at', row, col, text }),
  textInRow:   (row: number, text: string): Assertion => ({ kind: 'text_in_row', row, text }),
  textAnywhere:(text: string): Assertion => ({ kind: 'text_anywhere', text }),
  regexInRow:  (row: number, pattern: string, flags?: string): Assertion => ({ kind: 'regex_in_row', row, pattern, flags }),
  cursorIn:    (region: RegionSpec): Assertion => ({ kind: 'cursor_in', region }),
  cellAttr:    (row: number, col: number, attr: 'bold'|'italic'|'underline'|'inverse'|'strikethrough'): Assertion => ({ kind: 'cell_attr', row, col, attr }),
  altScreen:   (value: boolean): Assertion => ({ kind: 'alt_screen', value }),
  not:         (inner: Assertion): Assertion => ({ kind: 'not', inner }),
  anyOf:       (...items: Assertion[]): Assertion => ({ kind: 'any_of', items }),
  allOf:       (...items: Assertion[]): Assertion => ({ kind: 'all_of', items }),
};

export const step = {
  key:         (value: string): Step => ({ kind: 'key', value }),
  text:        (value: string): Step => ({ kind: 'text', value }),
  eraseLine:   (): Step => ({ kind: 'erase_line' }),
  clearToEol:  (): Step => ({ kind: 'clear_to_eol' }),
  waitMs:      (value: number): Step => ({ kind: 'wait_ms', value }),
  waitStable:  (ms?: number): Step => ({ kind: 'wait_stable', ms }),
};
```

Authoring example (nano):
```ts
// packages/nano/src/map/9.x.ts
import { defineMap, screen, transition, fp, step } from '@colgate/map';

export default defineMap({
  app: {
    name: 'nano',
    versions: '>=9.0.0 <10.0.0',
    launch: { argv: ['nano', '--nowrap', '--restricted=false', '${filename?}'] },
  },
  screens: [
    screen('edit', [
      fp.textInRow(-2, '^G Help'),
      fp.textInRow(-1, '^O Write Out'),
    ], { stableAfterMs: 25 }),
    screen('save_prompt', [
      fp.regexInRow(-3, '^File Name to Write'),
    ]),
    // …
  ],
  transitions: [
    transition('edit', 'save_prompt', 'open_save',
      [step.key('Ctrl+O')]),
    transition('save_prompt', 'edit', 'save_with_name',
      [step.eraseLine(), step.text('${filename}'), step.key('Enter')],
      { parameters: [{ name: 'filename', kind: 'string' }] }),
    // …
  ],
});
```

### 5.3 Runtime

```ts
// packages/map/src/runtime.ts

export class MapRuntime<Screens extends string = string, Actions extends string = string> {
  constructor(readonly terminal: Terminal, readonly map: AppMap);

  // --- Introspection ---
  currentScreen(opts?: { minConfidence?: number }): Screens | null;
  availableActions(): ReadonlyArray<ActionDescriptor<Actions>>;
  screenCandidates(): ReadonlyArray<{ id: Screens; score: number }>;
  history(): ReadonlyArray<TransitionEvent>;

  // --- Execution ---
  transition<A extends Actions>(
    action: A,
    params?: Record<string, unknown>,
    opts?: { timeoutMs?: number; from?: Screens },
  ): Promise<TransitionResult<Screens>>;

  goto(target: Screens, opts?: { maxDepth?: number }): Promise<Screens[]>; // BFS path through graph

  ensureScreen(expected: Screens, opts?: { timeoutMs?: number }): Promise<void>;

  // --- Events ---
  on(event: 'transition', cb: (e: TransitionEvent) => void): Unsubscribe;
  on(event: 'screenChange', cb: (e: ScreenChangeEvent<Screens>) => void): Unsubscribe;
  on(event: 'assertionFailure', cb: (e: AssertionFailureEvent) => void): Unsubscribe;
}
```

### 5.4 Fingerprint matcher

Design:
- Score-based, not boolean. Each `Assertion` returns a numeric score (weighted by `kind`). A screen matches if score ≥ threshold *and* no negative assertions fail.
- Weights: `text_at` 3, `title` 3, `regex_in_row` 2.5, `text_in_row` 2, `cursor_in` 1.5, `cell_attr` 1, `text_anywhere` 0.5, `alt_screen` 2. Tunable.
- Ties broken by history (prefer the most recent match).
- Ambiguous cases → return list; caller disambiguates.

### 5.5 Pathfinder

- Plain BFS (not A*; the graph is small enough that BFS is simpler and always optimal in unit cost).
- Input: `from` screen id, `to` screen id.
- Output: ordered list of action ids.
- Fallbacks: if `to` reachable only via parameterized transition, returns the path with a hole the caller must fill.

### 5.6 File layout

```
packages/map/src/
├── index.ts
├── schema.ts            # zod schemas + inferred types
├── define.ts            # defineMap, screen, transition, fp, step
├── runtime.ts           # MapRuntime class
├── fingerprint.ts       # scorer + matcher
├── pathfinder.ts        # BFS
├── executor.ts          # step runner (key, text, wait_stable, etc.)
├── substitution.ts      # ${param} substitution for text/argv
└── events.ts
```

### 5.7 Tests

- `schema.test.ts` — round-trip a variety of maps through zod; reject bad maps with specific error messages.
- `fingerprint.test.ts` — fixture screens + expected winning screen id.
- `pathfinder.test.ts` — synthetic graphs; assert shortest path; assert unreachable returns error.
- `runtime.test.ts` — scripted Terminal mock; drive a tiny toy map; assert events emitted in order.
- Integration: `runtime-vs-bash.test.ts` — drive a real `bash` with a handmade map (`idle` and `after_ls` screens); transition; verify.

---

## 6. Package: `@colgate/nano` — Premium Module

**Responsibility:** Expose every feature of `nano 9.x` as a typed method on a `Nano` facade class. Under the hood: the AppMap drives all navigation. Helpers that can't be expressed in the map (scroll tracking, cursor-line reconciliation) live here.

### 6.1 Feature matrix — enumerated commitment

The "every feature" contract is met when every entry below is covered by a typed method on the facade, backed by at least one transition in the map, and validated by at least one conformance test.

#### 6.1.1 Startup & environment
- Launch with any combination of these options (exposed via `NanoOpenOpts`):
  `--softwrap`, `--nowrap`, `--smooth`, `--autoindent`, `--tabsize=N`, `--tabstospaces`,
  `--mouse`, `--linenumbers`, `--showcursor`, `--suspendable`, `--indicator`,
  `--quiet`, `--restricted`, `--rcfile=<path>`, `--syntax=<name>`, `--backup`, `--backupdir=<path>`,
  `--positionlog`, `--unix`, `--noconvert`, `--preserve`, `--wordchars=<str>`
- Pin `LANG=C`, `LC_ALL=C`, `TERM=xterm-256color` by default; allow override.
- Read file, new buffer, multiple buffers at launch.

#### 6.1.2 Edit-mode keybindings (full surface)

| Category | Commands (all implemented) |
|---|---|
| Movement | Left, Right, Up, Down, Home (Ctrl+A), End (Ctrl+E), PgUp (Ctrl+Y), PgDn (Ctrl+V), First Line (M-\\), Last Line (M-/), Prev Word (Ctrl+Space / M-Space), Next Word (M-Space), To Matching Bracket (M-]), Go To Line (Ctrl+_), Go To Column (same prompt), To Anchor (M-Enter) |
| Editing | Insert char, Backspace (Ctrl+H), Delete (Ctrl+D), Enter (Ctrl+M), Tab (Ctrl+I), Cut Line (Ctrl+K), Paste (Ctrl+U), Cut To End (M-T), Copy (M-6 / Ctrl+^), Undo (M-U), Redo (M-E), Indent (M-}), Unindent (M-{), Complete (M-Tab, if configured), Execute (Ctrl+T + subselect), Delete Word Left (M-Backspace), Delete Word Right (M-Delete) |
| Selection | Set Mark (Ctrl+6 / M-A), Unset Mark (same), Select All (M-A twice + M-6 or similar; implement via mark + motion) |
| Search | Where Is (Ctrl+W), Next Occurrence (M-W), Search Backward (M-B in prompt), Case Sensitive (M-C toggle), Regex (M-R toggle), Whole Words (M-W — disambiguated from Next), Search and Replace (Ctrl+\\) |
| Replace | Replace prompt, per-match Y/N/A/Ctrl+C, Replace All (A) |
| File ops | Write Out (Ctrl+O) with sub-options: Append (M-A), Prepend (M-P), Backup (M-B), Convert DOS (M-D), Convert Mac (M-M), New Name (M-N); Read File (Ctrl+R) with sub-options: Execute Command (M-X / Ctrl+T inside prompt), Insert Into New Buffer (M-F), Pipe In (M-\|); Switch Buffer (M-<, M->), Close Buffer (Ctrl+X with unsaved prompt) |
| Multi-buffer | Prev Buffer (M-<), Next Buffer (M->), Close Current (Ctrl+X), Open New (implicit via Ctrl+R + M-F) |
| Display / view | Refresh (Ctrl+L), Scroll Up (M-- / M-_), Scroll Down (M-+ / M-=), Smooth Scroll toggle (M-S), Centered Cursor toggle (M-C), Line Numbers toggle (M-#), Softwrap toggle (M-$), Whitespace toggle (M-P), Auto-indent toggle (M-I), Cut-to-end toggle (M-K), Constant Cursor Position toggle (M-C — disambiguated) |
| Formatting | Justify paragraph (Ctrl+J), Full Justify (M-J), Spell Check (Ctrl+T → Spell subaction), Linter (Ctrl+T → Linter subaction), Formatter (Ctrl+T → Formatter subaction) |
| Info | Cur Pos (Ctrl+C), Word Count (M-D), Verbatim Input (M-V) |
| Help | Ctrl+G (enter); Ctrl+X (exit); Up/Down/PgUp/PgDn/Home/End in help |
| Exit | Ctrl+X (→ save-confirm if dirty), Discard (N in save-confirm), Save (Y in save-confirm) |
| Macro | Start Recording (M-:), Stop (M-:), Play (M-;) |
| Commenting | Comment/Uncomment line(s) (M-3) |
| Suspension | Ctrl+Z (if enabled) |
| Numeric arg | Prefix (M-0 through M-9 / M-.)? — implement if documented in `man nano` |

> **Source of truth:** `man nano` + `nano --help` + the Ctrl+G help screen of the installed 9.0 binary. Before implementation, run a script that dumps these three and diffs them against the feature matrix; any discrepancy is an open issue.

#### 6.1.3 Prompt-mode keybindings (Write Out, Read File, Where Is, Replace, Goto, Execute)
- All meta-toggles documented at the bottom of each prompt (different per prompt).
- Ctrl+C to cancel. Tab completion (for path-taking prompts). Ctrl+T to enter file browser.

#### 6.1.4 File browser (entered from Write Out or Read File via Ctrl+T)
- Navigate (arrows, PgUp/PgDn, Home/End).
- Enter to descend or select.
- `^_` (Ctrl+_) go to directory.
- Search within browser (Ctrl+W).
- Exit back to prompt (Ctrl+X or Esc).

#### 6.1.5 Spell / Linter / Formatter
- Each is an external command configured in rcfile. The module exposes `spellCheck()`, `lint()`, `format()` that invoke Ctrl+T + selection, then the external prompt/output flow.

#### 6.1.6 Macro recording & playback
- `recordMacro(fn)` returns helper that starts recording (M-:), runs `fn`, stops recording, returns playable handle. `playMacro(h, n?)` replays it n times.

### 6.2 Screen catalog (complete list for nano 9.0)

```
edit
  ├── save_prompt                 (after Ctrl+O)
  │   ├── file_browser            (after Ctrl+T from save_prompt)
  │   └── save_options_overlay    (M-A, M-P, M-B, M-D, M-M, M-N visible as footer flags; no new screen, just toggled state)
  ├── read_file_prompt            (after Ctrl+R)
  │   └── execute_command_prompt  (after M-X or Ctrl+T from read_file_prompt)
  ├── search_prompt               (after Ctrl+W)
  ├── search_and_replace_find     (after Ctrl+\)
  │   └── search_and_replace_with
  │       └── search_and_replace_confirm (per-match)
  ├── goto_line_prompt            (after Ctrl+_)
  ├── help                        (after Ctrl+G)
  ├── exit_confirm_dirty          (after Ctrl+X when dirty)
  ├── spell_check_session         (after spell trigger)
  ├── linter_session
  └── formatter_session
```

Each screen has a concrete fingerprint set using hint-bar text, overlay text, cursor position, or alt-screen state.

### 6.3 Facade API

```ts
// packages/nano/src/nano.ts

import type { Terminal } from '@colgate/core';
import type { MapRuntime } from '@colgate/map';

export interface NanoOpenOpts {
  // mirrors nano CLI flags
  softwrap?: boolean;
  tabsize?: number;
  tabsToSpaces?: boolean;
  autoindent?: boolean;
  showLineNumbers?: boolean;
  mouse?: boolean;
  syntax?: string;
  rcfile?: string;
  backup?: boolean;
  backupDir?: string;
  restricted?: boolean;
  positionLog?: boolean;
  wordchars?: string;
  env?: Record<string, string>;
  cwd?: string;
  cols?: number;
  rows?: number;
}

export class Nano {
  static async open(
    terminalOrOpts: Terminal | { spawn: NanoOpenOpts & { file?: string; files?: string[] } },
    file?: string,
    opts?: NanoOpenOpts,
  ): Promise<Nano>;

  readonly terminal: Terminal;
  readonly runtime: MapRuntime<NanoScreen, NanoAction>;

  // --- Movement ---
  moveTo(pos: { line: number; col?: number }): Promise<void>;
  gotoStart(): Promise<void>;
  gotoEnd(): Promise<void>;
  gotoLine(line: number, col?: number): Promise<void>;
  moveWord(direction: 'prev' | 'next'): Promise<void>;
  moveBracketMatch(): Promise<void>;
  setAnchor(): Promise<void>;
  gotoAnchor(): Promise<void>;

  // --- Editing ---
  type(text: string): Promise<void>;
  newline(): Promise<void>;
  tab(): Promise<void>;
  backspace(n?: number): Promise<void>;
  deleteChar(n?: number): Promise<void>;
  cutLine(): Promise<void>;
  cutToEnd(): Promise<void>;
  copy(): Promise<void>;
  paste(): Promise<void>;
  undo(n?: number): Promise<void>;
  redo(n?: number): Promise<void>;
  indent(): Promise<void>;
  unindent(): Promise<void>;
  toggleComment(): Promise<void>;
  deleteWord(direction: 'prev' | 'next'): Promise<void>;
  verbatim(bytes: string): Promise<void>;

  // --- Selection / mark ---
  mark(): Promise<void>;                   // enter mark mode
  unmark(): Promise<void>;
  withSelection(body: () => Promise<void>): Promise<void>;   // mark, body, copy/cut
  selectAll(): Promise<void>;

  // --- Search / replace ---
  search(query: string, opts?: { caseSensitive?: boolean; regex?: boolean; wholeWords?: boolean; backward?: boolean }): Promise<SearchResult>;
  searchNext(): Promise<SearchResult>;
  replace(opts: { find: string; with: string; caseSensitive?: boolean; regex?: boolean; all?: boolean; confirmEach?: (match: Match) => 'yes'|'no'|'all'|'cancel' }): Promise<number>;

  // --- File ---
  save(): Promise<void>;                   // idempotent
  saveAs(path: string, opts?: { append?: boolean; prepend?: boolean; backup?: boolean; lineEnding?: 'unix' | 'dos' | 'mac'; newBuffer?: boolean }): Promise<void>;
  insertFile(path: string, opts?: { intoNewBuffer?: boolean; pipeIn?: boolean }): Promise<void>;
  executeCommand(cmd: string, opts?: { intoNewBuffer?: boolean; pipeSelection?: boolean }): Promise<string>;
  cursorInfo(): Promise<{ line: number; col: number; totalLines: number; totalChars: number }>;
  wordCount(): Promise<{ words: number; lines: number; chars: number }>;
  isDirty(): Promise<boolean>;
  filename(): Promise<string | null>;

  // --- Buffers ---
  nextBuffer(): Promise<void>;
  prevBuffer(): Promise<void>;
  closeBuffer(opts?: { discard?: boolean }): Promise<void>;
  openFile(path: string, opts?: { newBuffer?: boolean }): Promise<void>;

  // --- Display toggles ---
  toggleSoftwrap(): Promise<void>;
  toggleLineNumbers(): Promise<void>;
  toggleWhitespace(): Promise<void>;
  toggleAutoindent(): Promise<void>;
  toggleSmoothScroll(): Promise<void>;
  toggleCenteredCursor(): Promise<void>;
  toggleConstantCursor(): Promise<void>;

  // --- Format / tools ---
  justify(paragraph?: boolean): Promise<void>;                   // false = full
  spellCheck(): Promise<SpellSession>;
  lint(): Promise<LintSession>;
  format(): Promise<FormatSession>;

  // --- Help ---
  openHelp(): Promise<HelpView>;

  // --- Macros ---
  recordMacro(body: () => Promise<void>): Promise<Macro>;
  playMacro(m: Macro, times?: number): Promise<void>;

  // --- Exit ---
  exit(opts?: { discard?: boolean }): Promise<void>;
  refresh(): Promise<void>;
  suspend(): Promise<void>;                                      // if suspendable enabled
}
```

### 6.4 Known quirks & mitigations (nano)

| Quirk | Mitigation |
|---|---|
| Line wrapping changes cursor-row vs file-line mapping | Default `--nowrap`. When `softwrap:true` is requested, use Ctrl+C (`cursorInfo()`) to read ground-truth line/col from nano rather than deriving from grid. |
| Status-line toasts ("Wrote N lines", "Search wrapped") are transient | After a transition, `waitForStable(80)` before fingerprinting the target screen. |
| Modified-state indicator differs by rcfile | Dual-strategy: look for "Modified" literal AND for the title-bar star. Either matches dirty. |
| `Ctrl+T` behavior depends on rcfile (spell/linter/formatter/execute) | On `open()`, probe via `--rcfile=/dev/null --restricted=false` plus explicit `set spellercompat` etc. Provide `executeCommand()` plus `spellCheck()`/`lint()`/`format()` that each assume the corresponding config. |
| File browser keys differ slightly between nano versions | Version-specific map file (`9.x.ts`, `8.x.ts`); load by probing `nano --version`. |
| Numeric prefix (M-0 through M-9) only active in some rcfiles | Documented as opt-in via `enableNumericPrefix: true` in `NanoOpenOpts`; feature gated. |
| Terminal resize mid-session | Subscribe to `terminal.on('screen')` and invalidate cached element regions. |
| Verbatim input swallows next byte | `verbatim(s)` sends M-V, then raw bytes; no waits between. |

### 6.5 File layout (`packages/nano/`)

```
packages/nano/
├── src/
│   ├── index.ts                   # export { Nano }
│   ├── nano.ts                    # facade class
│   ├── options.ts                 # NanoOpenOpts → argv translator
│   ├── cursor.ts                  # cursorInfo() via Ctrl+C parse
│   ├── search.ts                  # search flow impl
│   ├── replace.ts                 # replace flow impl
│   ├── save.ts                    # save/saveAs with option flags
│   ├── file-browser.ts            # file-browser navigation helpers
│   ├── buffers.ts                 # multi-buffer helpers
│   ├── macros.ts                  # record/play
│   ├── subsessions/
│   │   ├── spell.ts
│   │   ├── lint.ts
│   │   └── format.ts
│   └── map/
│       ├── index.ts               # load-by-version
│       ├── 9.x.ts                 # AppMap for nano 9.x
│       ├── 8.x.ts                 # AppMap for nano 8.x (regression targets)
│       └── 7.x.ts                 # AppMap for nano 7.x
├── test/
│   ├── unit/
│   ├── replay/                    # replay-based tests using fixtures/nano/
│   └── conformance/
└── package.json
```

### 6.6 Test plan (nano)

Unit:
- Every option in `NanoOpenOpts` → correct argv.
- Cursor-info parser: feed synthetic status-line strings, assert parsed triples.
- Search-result parser and replace-state machine: pure unit.

Replay fixtures:
- One `.cast` per feature category (movement, editing, search, save, buffers, help, macro).
- Replay into a Terminal stub; run the facade operation; assert screen state after.

Conformance (in Docker, real nano 9.0):
- `nano-smoke.test.ts` — open, type, save, exit.
- `nano-search.test.ts` — all search flag combinations.
- `nano-replace.test.ts` — all-at-once and per-match.
- `nano-buffers.test.ts` — open two files, switch, close one.
- `nano-file-browser.test.ts` — navigate, select, insert.
- `nano-help.test.ts` — open help, scroll, exit.
- `nano-spell.test.ts` — with a pre-configured aspell stub.
- `nano-macro.test.ts` — record and play a multi-step macro.
- `nano-every-meta.test.ts` — parameterized over every M-* documented in the feature matrix; assert each produces the expected screen state (via fingerprint change or no-op verification).

Versions 7.2 and 8.0 run the same suite against their version-specific maps.

---

## 7. Package: `@colgate/htop` — Premium Module

### 7.1 Feature matrix

#### 7.1.1 Startup & environment
Launch options exposed via `HtopOpenOpts`:
`-d|--delay=N` (tenths of a second), `-C|--no-color`, `-M|--no-mouse`, `-t|--tree`, `-F|--filter=<str>`, `-p|--pid=<list>`, `-u|--user=<name>`, `-s|--sort-key=<col>`, `-U|--no-unicode`, `-H|--highlight-changes`, `--readonly`, `--drop-capabilities=off|strict|basic`, custom `--config-file=<path>`.
Default dev-env sets `LANG=C LC_ALL=C TERM=xterm-256color`, `-d 50` (5s refresh), `-C` for deterministic layout in CI.

#### 7.1.2 Main-screen commands (complete)

| Category | Commands |
|---|---|
| F-keys | F1 Help, F2 Setup, F3 Search, F4 Filter, F5 Tree toggle, F6 Sort by, F7 Nice −, F8 Nice +, F9 Kill, F10 Quit |
| Alt-of-Fkeys (mouse/alt bindings) | Same set via letter aliases: `h`/`?` help; `S` setup; `/` search; `\\` filter; `t` tree; `>`/`<` sort by (direct column); `]` nice −; `[` nice +; `k` kill; `q` quit |
| Sort | `I` invert, `M` sort by MEM%, `P` sort by CPU%, `T` sort by TIME+, `N` sort by PID |
| Navigation | Up/Down/PgUp/PgDn/Home/End/Left/Right (horizontal scroll through wide columns) |
| Tag | Space tag/untag, `c` tag children, `U` untag all |
| Tree | `+`/`-` expand/collapse subtree, `*` expand/collapse all, `t` toggle tree mode |
| Threads | `H` toggle user threads, `K` toggle kernel threads |
| View options (on-the-fly) | `p` show full program path, `u` filter by user (interactive select), `F` follow selected process, `.` select displayed column (hides/shows) |
| External tools | `s` strace selected process, `l` lsof selected process, `L` library trace (ltrace) if configured |
| Affinity | `a` set CPU affinity (opens affinity dialog) |
| Signal | `k`/F9 kill — opens signal picker left panel |
| Nice | F7/F8 change niceness by ±1 |
| Refresh | Auto; no manual refresh key |
| Quit | `q` / F10 |

#### 7.1.3 Search/Filter overlays
- Search (F3): incremental, typed characters shown at bottom; Enter to apply and return to main; Esc to cancel; F3 again for next match.
- Filter (F4): persistent; displayed in header; cleared via F4 + Esc.

#### 7.1.4 Kill flow (F9 / `k`)
- Left pane replaced by signal list.
- Up/Down to select signal; Enter to send to tagged processes (or the highlighted process if none tagged); Esc to cancel.
- Supports typing a number to jump to a signal by index.

#### 7.1.5 Nice flow (F7/F8)
- F7 decreases (more favorable) by 1 per press; F8 increases (less favorable) by 1.
- Applies to tagged processes, else to highlighted.

#### 7.1.6 Setup (F2 / `S`)

Sub-screens, all with nested state:

**Meters**
- Two panels (Left column, Right column) of meters.
- Available meters (CPU, CPU avg, Memory, Swap, Tasks, Load average, Uptime, Battery, Hostname, Systemd, Clock, Disk IO, Network IO, File descriptors, Zram, Zfs ARC, Pressure Stall, Dynamic, … — from `htop --help` or source).
- Operations: add (select from right-side available list), remove, move up/down, change display mode (Text, Bar, Graph, LED).

**Display options** (boolean toggles; full list from htop 3.5.0 source):
- Tree view always by default
- Shadow other users' processes
- Hide kernel threads
- Hide userland process threads
- Hide running processes in other user's ptrees
- Display threads in a different color
- Show custom thread names
- Show program path
- Highlight program basename
- Highlight deleted executables
- Highlight non-default priority processes
- Merge exe, comm, and cmdline
- Show processes of a single user (sticky)
- Count CPUs from 1 instead of 0
- Update process names on refresh
- Add guest time in CPU time
- Show guest time in CPU meter
- Hide processes below a threshold % (with threshold)
- Use detailed CPU time
- Show process deltas (CPU-D, IO-R, IO-W)
- Heads up display (HUD)
- Header layout options (2-column, 3-column, etc.)
- Leave a margin around header
- Detailed CPU breakdown
- Highlight large numbers in memory counters
- Highlight syscall traced processes
- Enable the mouse
- Show text color-mapped values
- Show CPU usage, frequency, temperature on separate lines
- Show CPU usage in multiple formats
- Enable vi-mode (if supported)

(The exact set is enumerated at build time from the `htop --show-options` or source constants; each toggle is available via `setup.displayOptions.set(name, boolean)` and `setup.displayOptions.toggle(name)` with a validated enum of names.)

**Colors**: preset scheme selection (Default, Monochromatic, Black on white, Light terminal, MC, Black night, Broken gray, Synthwave, …).

**Columns**:
- Current columns on the left (move up/down, remove).
- Available columns on the right (add).
- Columns include: PID, USER, PRI, NI, VIRT, RES, SHR, STATE, CPU%, MEM%, TIME+, COMMAND, COMMAND_LINE, TGID, SESSION, TTY, PGRP, IO_READ_RATE, IO_WRITE_RATE, NPROCS, M_SHARE, M_CODE, M_DATA, M_LRS, … (full list from htop source `columns.xml`/`RowField.h`).

**Screens** (tabs; htop 3.5 introduces user-defined multi-screen layouts):
- Add/rename/remove screen tabs.
- Per-screen columns/filter.

**Hotkeys in setup**: F10 / Enter to save and exit; Esc to cancel.

### 7.2 Screen catalog

```
main
  ├── search_overlay           (F3 / /)
  ├── filter_overlay           (F4 / \\)
  ├── sort_overlay             (F6)
  ├── kill_signal_picker       (F9 / k)
  ├── user_filter_dialog       (u)
  ├── affinity_dialog          (a)
  ├── help                     (F1 / ? / h)
  ├── follow_state             (F)           — no separate screen, but decorated
  └── setup
      ├── setup_meters
      │   ├── setup_meters_select_available
      │   └── setup_meters_display_mode
      ├── setup_display_options
      ├── setup_colors
      ├── setup_columns
      │   ├── setup_columns_select_available
      └── setup_screens        (htop 3.5 feature)
          └── setup_screens_edit
```

### 7.3 Facade API

```ts
export class Htop {
  static async open(terminal: Terminal, opts?: HtopOpenOpts): Promise<Htop>;

  readonly terminal: Terminal;
  readonly runtime: MapRuntime<HtopScreen, HtopAction>;

  // --- Reads ---
  processes(opts?: { includeHidden?: boolean }): Promise<Process[]>;
  selection(): Promise<Process | null>;
  taggedPids(): Promise<number[]>;
  columns(): Promise<ColumnName[]>;
  sortedBy(): Promise<{ column: ColumnName; descending: boolean }>;
  filter(): Promise<string | null>;
  searchTerm(): Promise<string | null>;
  cpuSummary(): Promise<CpuInfo[]>;
  memorySummary(): Promise<MemoryInfo>;
  loadAverage(): Promise<[number, number, number]>;
  uptime(): Promise<number>;

  // --- Navigation / select ---
  scroll(direction: 'up' | 'down' | 'pageUp' | 'pageDown' | 'home' | 'end', n?: number): Promise<void>;
  selectByIndex(i: number): Promise<void>;
  selectByPid(pid: number): Promise<void>;
  selectByName(regex: RegExp): Promise<void>;
  follow(enable?: boolean): Promise<void>;

  // --- View / mode toggles ---
  toggleTree(): Promise<void>;
  toggleKernelThreads(): Promise<void>;
  toggleUserThreads(): Promise<void>;
  toggleProgramPath(): Promise<void>;
  expand(): Promise<void>;          // +
  collapse(): Promise<void>;        // -
  expandAll(): Promise<void>;       // *

  // --- Sort ---
  sortBy(column: ColumnName, opts?: { descending?: boolean }): Promise<void>;
  invertSort(): Promise<void>;

  // --- Search / filter ---
  search(query: string, opts?: { live?: boolean }): Promise<{ found: boolean; pid?: number }>;
  searchNext(): Promise<void>;
  searchCancel(): Promise<void>;
  setFilter(query: string): Promise<void>;
  clearFilter(): Promise<void>;
  filterByUser(user: string): Promise<void>;

  // --- Tags ---
  tag(target?: number | RegExp | 'selected'): Promise<void>;
  tagChildren(): Promise<void>;
  untagAll(): Promise<void>;

  // --- Signals / nice / affinity ---
  kill(opts?: { pid?: number; pids?: number[]; signal?: Signal }): Promise<void>;
  nice(delta: number, opts?: { pid?: number; pids?: number[] }): Promise<void>;
  setAffinity(cpus: number[] | 'all', opts?: { pid?: number; pids?: number[] }): Promise<void>;

  // --- External tools ---
  strace(opts?: { pid?: number }): Promise<StraceSession>;
  lsof(opts?: { pid?: number }): Promise<LsofSession>;
  ltrace(opts?: { pid?: number }): Promise<LtraceSession>;

  // --- Setup ---
  readonly setup: HtopSetup;

  // --- Lifecycle ---
  quit(): Promise<void>;
  refresh(): Promise<void>;   // no-op: htop auto-refreshes; provided for symmetry
}

export interface HtopSetup {
  open(): Promise<void>;
  save(): Promise<void>;
  cancel(): Promise<void>;
  meters: {
    panels(): Promise<{ left: MeterSpec[]; right: MeterSpec[] }>;
    add(side: 'left'|'right', meter: MeterType, mode?: MeterMode): Promise<void>;
    remove(side: 'left'|'right', index: number): Promise<void>;
    move(side: 'left'|'right', fromIndex: number, toIndex: number): Promise<void>;
    setMode(side: 'left'|'right', index: number, mode: MeterMode): Promise<void>;
    list(): Promise<MeterType[]>;                 // available meters on this system
  };
  displayOptions: {
    list(): Promise<{ name: DisplayOption; enabled: boolean }[]>;
    set(name: DisplayOption, enabled: boolean): Promise<void>;
    toggle(name: DisplayOption): Promise<void>;
  };
  colors: {
    schemes(): Promise<string[]>;
    current(): Promise<string>;
    setScheme(name: string): Promise<void>;
  };
  columns: {
    current(): Promise<ColumnName[]>;
    available(): Promise<ColumnName[]>;
    add(name: ColumnName, at?: number): Promise<void>;
    remove(name: ColumnName): Promise<void>;
    move(name: ColumnName, to: number): Promise<void>;
  };
  screens: {
    list(): Promise<ScreenTab[]>;
    add(spec: Partial<ScreenTab>): Promise<void>;
    rename(oldName: string, newName: string): Promise<void>;
    remove(name: string): Promise<void>;
    select(name: string): Promise<void>;
  };
}
```

`DisplayOption`, `MeterType`, `MeterMode`, `ColumnName` are string-literal union types, generated at build time from `packages/htop/src/generated/options-3.5.ts` which in turn is produced by scraping the installed htop binary during a one-time tooling step. A checked-in snapshot keeps tests hermetic.

### 7.4 Known quirks & mitigations (htop)

| Quirk | Mitigation |
|---|---|
| Constant redraw makes `waitForStable` useless for `main` | Use **structural fingerprint**: ignore cells in `volatileRegions` (process-list rows, CPU/Mem/Swap meters); only hash hint bar, headers, and screen title. |
| Column header row floats depending on whether tree view is active | Detect header row via cell-attr inverse pattern; cache column map per `(treeMode, columns)` state. |
| Process list row count varies with terminal height, tree expansion, filter | Re-parse the table each time `processes()` is called; derive column boundaries from header row. |
| Locale-translated strings | Pin `LANG=C LC_ALL=C`. Unit test asserts header labels match English spec. |
| `htop --no-color` changes display attrs but not content | Acceptable; fingerprints rely on text + position, not color. |
| Setup sub-screens share a layout but the selected category is the focus | Fingerprint on the *title bar* + which category line is highlighted (inverse). |
| F-keys may not arrive correctly through some terminal stacks | We control the PTY + state engine, so encoding is deterministic; still add a fallback via `--no-mouse` and letter aliases. |
| `-d` delay in tenths-of-seconds; minimum 1 (0.1s); maximum 255 | Validate and clamp in `HtopOpenOpts`. Default `-d 50` (5s) for tests, `-d 15` for interactive. |
| Setup "Screens" tab only on htop ≥ 3.2 | Version-gate in map; throw `NotSupportedInVersionError` for older htop. |
| External tools (strace/lsof) take over terminal fully | Model as sub-sessions with their own `close()` that returns to main. |

### 7.5 File layout

```
packages/htop/
├── src/
│   ├── index.ts
│   ├── htop.ts                    # facade class
│   ├── options.ts                 # HtopOpenOpts → argv
│   ├── process-list.ts            # header parse, row parse, column map
│   ├── meters.ts
│   ├── setup.ts
│   ├── subsessions/
│   │   ├── strace.ts
│   │   ├── lsof.ts
│   │   └── ltrace.ts
│   ├── generated/
│   │   ├── display-options-3.5.ts # union types + labels
│   │   ├── meters-3.5.ts
│   │   ├── columns-3.5.ts
│   │   └── color-schemes-3.5.ts
│   └── map/
│       ├── index.ts
│       ├── 3.5.x.ts
│       ├── 3.4.x.ts
│       └── 3.3.x.ts
├── scripts/
│   └── gen-options.ts             # one-time codegen from a running htop
├── test/
│   ├── unit/
│   ├── replay/
│   └── conformance/
└── package.json
```

### 7.6 Test plan (htop)

Unit:
- Process-list parser: feed real captured header + body rows; assert records per expected column permutations (default, tree-on, custom columns).
- Options codegen output: snapshot tests against known htop versions.
- Setup navigation planner: from any starting category, generate correct key sequence to reach another.

Replay fixtures (deterministic):
- Captures of each setup sub-screen and each overlay.

Conformance (Docker, real htop 3.5):
- Smoke: open, read processes, quit.
- Search: finds known process (sleep N for large N).
- Filter: filter by user; assert table narrows.
- Sort: sort by CPU, MEM, PID, TIME; invert.
- Tag + kill: tag by regex, send signal 0 (noop-safe), assert tags cleared.
- Nice: change nice of a known process; verify via `ps -o ni`.
- Setup meters: add/remove/reorder; save; reopen; confirm persisted via htoprc read.
- Setup display options: toggle each; save; verify via htoprc content.
- Setup columns: add/remove/reorder; save; verify via htoprc.
- Setup screens: create screen, switch, remove.
- Kill flow, signal picker, affinity dialog, user filter dialog, search, filter overlays all exercised.

htop 3.3 and 3.4 run the subset that their maps support.

---

## 8. Package: `@colgate/recorder`

Dev tool. Emits a draft AppMap (TS source) from an interactive session.

**Flow:**
1. User runs `colgate record --app nano -o draft.ts -- nano /tmp/f`.
2. Tool spawns the app inside a managed Terminal; user drives it in their actual terminal by way of a pass-through relay.
3. Every keystroke is recorded. Before and after each keystroke, a Snapshot is taken.
4. Fingerprints are heuristically proposed for each *distinct* post-keystroke screen hash.
5. Transitions are computed as `(prevScreenHash, key, nextScreenHash)` triples; deduplicated.
6. On stop, user is prompted (in a simple CLI wizard) to name each newly discovered screen and transition action.
7. Output is a TS module that uses `defineMap` and is *actually valid TS* the user can compile.

**Out of scope v0.1:** fully autonomous map synthesis. Recorder assists a human author; it doesn't replace them.

**File layout:**
```
packages/recorder/src/
├── index.ts
├── cli.ts
├── passthrough.ts       # raw TTY passthrough with mirroring to the managed Terminal
├── snapshotter.ts
├── fingerprint-suggest.ts
├── wizard.ts
└── emit-ts.ts
```

---

## 9. Package: `@colgate/inspector`

Live devtools TUI. Run alongside an existing session (or spawn one) and see, in real time:
- Current screen hash
- Top-N matching screens from the loaded AppMap, with scores
- Failed assertions in the best-matching screen
- Highlighted element regions (overlaid on a captured screenshot text view)
- Recent byte chunks, transitions, and errors

Implementation: thin TUI built on `@colgate/core` (eating its own dog food for a read-only split-pane terminal view). Not a web UI in v0.1.

---

## 10. Package: `@colgate/testing`

Vitest matchers and helpers.

```ts
// packages/testing/src/index.ts
import { expect } from 'vitest';
import type { Terminal, Snapshot } from '@colgate/core';

declare module 'vitest' {
  interface Assertion<T> {
    toShowText(text: string | RegExp): void;
    toShowTextIn(region: RegionSpec, text: string | RegExp): void;
    toBeOnScreen(screenId: string): void;
    toHaveCursorAt(pos: Partial<CursorPos>): void;
    toMatchSnapshot(filename: string): void;  // saves Snapshot.ansi() to disk
  }
}

export function replayFixture(path: string): Promise<Terminal>;  // feeds .cast bytes into a mocked Terminal
```

---

## 11. Package: `@colgate/cli`

Single entrypoint with subcommands — users `npx @colgate/cli record …`.

```
colgate
├── record <app> [-o out.ts] -- <argv...>
├── inspect <app> -- <argv...>
├── test <package>                     # runs that package's vitest suite
├── validate <map.ts>                  # zod parses + sanity checks
├── run <app> <action> [params…]       # one-shot: spawn, transition, quit
└── version
```

Only `record`, `inspect`, `validate`, `version` ship in v0.1. `test` and `run` are v0.2.

---

## 12. Testing Strategy & CI

### Unit + replay tests
- Run on every PR, Ubuntu + macOS, Node 22 + 24.
- Coverage target: **≥ 90%** lines across core, map, nano, htop (excluding generated files).

### Conformance tests
- Runs against real binaries in Docker images.
- Images:
  - `ghcr.io/<org>/colgate-nano:9.0`, `:8.0`, `:7.2`
  - `ghcr.io/<org>/colgate-htop:3.5.0`, `:3.4.0`, `:3.3.0`
- Dockerfiles in `fixtures/docker/`.
- Runs on: push to main, tag release, nightly.

### Fixture format
- `.cast` = asciinema v2 JSON-lines.
- Each fixture is paired with a sidecar `.meta.json` containing the screen trajectory (list of `{ ms, screenId, cursor }` for post-facto assertions).

### CI workflow outline (`.github/workflows/ci.yml`)
```yaml
jobs:
  lint:            # eslint + prettier + tsc --noEmit
  unit:            # matrix: os={ubuntu,macos} × node={22,24}
  replay:          # reads fixtures/, runs replay tests
  typecheck:       # cross-package tsc --build
```

### Conformance workflow (`.github/workflows/conformance.yml`)
- Triggered: workflow_dispatch, on release, nightly cron.
- Per-version Docker build; runs `pnpm -F @colgate/nano conformance` inside.

---

## 13. Release Strategy

- `changesets` for every PR that touches a package.
- `pnpm release` runs on tag push (`v*.*.*`); uses the changeset versioner.
- NPM publish with `--provenance` (supply-chain signing).
- Each package has its own semver; no lockstep.
- v0.1 releases as `0.1.0-alpha.N` until the feature matrix is green, then `0.1.0`.

---

## 14. Docs (v0.1 minimum)

- `README.md` at repo root — intro, quick start, links.
- Per-package `README.md` — one-page API summary.
- `docs/` (VitePress) — built on release. v0.1 content:
  - Getting Started
  - Core API reference (auto from TypeDoc)
  - Map format reference
  - Nano module cookbook (10 recipes)
  - Htop module cookbook (10 recipes)
  - Recorder walkthrough (authoring a new map)
  - Architecture overview

---

## 15. Milestones

| # | Milestone | Duration (solo) | Exit criteria |
|---|---|---|---|
| M0 | Repo + CI scaffolding | 1 week | Empty monorepo builds; CI green on lint/typecheck |
| M1 | `@colgate/core` v0.1 | 4 weeks | Full public API; unit + integration tests green on Linux + macOS |
| M2 | `@colgate/map` v0.1 | 3 weeks | Schema, runtime, pathfinder; integration test against real `bash` |
| M3 | `@colgate/nano` v0.1-alpha (smoke coverage) | 3 weeks | open / type / save / exit / search working against nano 9.0 |
| M4 | `@colgate/htop` v0.1-alpha (smoke coverage) | 3 weeks | open / processes / search / sort / kill (signal 0) / quit working |
| M5 | `@colgate/recorder` + `@colgate/inspector` | 3 weeks | Recorder produces TS map that round-trips; inspector shows live fingerprint |
| M6 | Nano full feature matrix | 8 weeks | Every feature in §6.1 covered; conformance against 7.2/8.0/9.0 green |
| M7 | Htop full feature matrix | 8 weeks | Every feature in §7.1 covered; conformance against 3.3/3.4/3.5 green |
| M8 | Hardening, docs, examples, v0.1.0 release | 4 weeks | All docs shipped, 3 worked examples, changelogs complete, versions 0.1.0 tagged |

Total: **~37 weeks solo** ≈ **9–10 months**, assuming minimal context switching. With a second engineer owning M6 while the first owns M7 plus polish, cut to **~6 months**.

---

## 16. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Feature-matrix completeness is under-specified; "every feature" is a moving target | High | Before M6/M7, lock the matrix by parsing `man nano`, `nano --help`, and Ctrl+G help screen; same for htop (`man htop`, `--help`, `htoprc` documented options). Output a diff-vs-matrix report; any gap is a ticket. |
| Nano rcfile variability breaks fingerprints | Med | Ship a pinned `fixtures/nano/rcfile` used in conformance; doc the expected-config contract in the module README. |
| Htop redraws make transitions flaky | High | `volatileRegions` ignored in fingerprints; use `-d 255` (max) during tests that don't need live data. |
| Cross-platform differences (Linux vs macOS PTY) | Med | Test matrix covers both from M0; `node-pty` already handles; rely on shared `fixtures/` for parity. |
| Version drift (nano 9.1 ships and changes a prompt) | Med | Per-version maps; version probe on `open()`; `NotSupportedInVersionError` thrown with clear guidance. |
| Scope creep into MCP / remote / LLM territory | Med | Documented non-goals (§1). Defer all such asks to post-v0.1 issues. |
| Bus factor — solo dev stalls | High | Every piece documented in this plan to the file level so work is handoff-friendly. |
| Upstream xterm.js or node-pty regression | Low | Pin to known-good versions; run conformance nightly so regressions surface fast. |
| Deterministic locale gets overridden by user env | Low | `deterministicEnv: true` by default in `SpawnOpts`; logged in session metadata. |
| Performance at scale (100+ sessions) | Low (deferred) | Not a v0.1 goal; documented as v0.2 concern. |

---

## 17. Verification — how we know v0.1 is done

v0.1 is done when *all* of the following are true:

1. **Monorepo builds cleanly** from a fresh clone on Ubuntu 24.04 and macOS 14 with:
   ```
   git clone …
   corepack enable
   pnpm install
   pnpm -w build
   pnpm -w test
   ```
   Zero failures, zero TypeScript errors, zero lint errors.

2. **Core integration test** — `pnpm -F @colgate/core test:integration` passes on both OSes. Smoke-spawns `bash`, `less`, and a custom tiny TUI written for the test.

3. **Nano conformance** — `pnpm -F @colgate/nano conformance` passes against Docker images for nano 7.2, 8.0, 9.0. Every feature in §6.1 is exercised at least once.

4. **Htop conformance** — `pnpm -F @colgate/htop conformance` passes against Docker images for htop 3.3.0, 3.4.0, 3.5.0. Every feature in §7.1 is exercised at least once.

5. **Three end-to-end example scripts** in `examples/` run successfully on a dev machine without modification:
   - `examples/nano-basic.ts` — open, type a greeting, save, exit; assert file on disk.
   - `examples/htop-kill-cpu-hog.ts` — spawn a known CPU-burner, htop finds it by name, sends SIGTERM, asserts process gone.
   - `examples/custom-agent-loop.ts` — a bare-bones loop that spawns `bash`, issues typed commands, reads output; meant as the starter template for agent builders.

6. **Recorder** produces a compilable TS map file from a manual nano session; that file, when loaded, passes `colgate validate`.

7. **Inspector** runs alongside a live htop session and correctly identifies `main`, `search_overlay`, and `setup_display_options` screens when the user navigates to each.

8. **Docs site** builds (`pnpm -F docs build`) without warnings and deploys to GitHub Pages or equivalent.

9. **npm dry-run publish** (`pnpm publish --dry-run -F '@colgate/*'`) succeeds for every package with correct `files`, `exports`, `types`, `main`, `module` entries.

10. **Manual acceptance test**: a fresh-clone user, given only the README, can get the `nano-basic.ts` example running in under 10 minutes.

---

## 18. Day-1 Bootstrap Commands (read-only informational)

After plan approval and exit from plan mode, execution begins with:

```bash
# 1. Copy this plan into the project directory.
cp /home/stk/.claude/plans/agreed-let-s-make-a-curious-neumann.md \
   /home/stk/workspace/engineering/adjutant/terminal-use/PLAN_COLGATE.md

# 2. Initialize the repo.
cd /home/stk/workspace/engineering/adjutant/terminal-use
git init
echo "22" > .nvmrc
corepack enable pnpm
pnpm init
# (edit package.json: name, private:true, workspaces, scripts)

# 3. Workspace bootstrap.
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - 'packages/*'
  - 'docs'
EOF

# 4. Baseline TS config + tooling.
pnpm add -Dw typescript@^5.5 vitest@^2 @types/node@^22 \
  tsup prettier eslint @eslint/js typescript-eslint \
  @changesets/cli turbo simple-git-hooks lint-staged

# 5. Scaffold each package.
for p in core map nano htop recorder inspector testing cli; do
  mkdir -p "packages/$p/src" "packages/$p/test"
done

# 6. First package build.
pnpm -F @colgate/core install node-pty @xterm/headless @xterm/addon-serialize @xterm/addon-unicode11 zod
```

Actual execution is gated on plan approval.

---

## 19. Paths of critical files that will be created/modified

> (All new in v0.1 — this is a greenfield project.)

**Repo root**
- `/home/stk/workspace/engineering/adjutant/terminal-use/PLAN_COLGATE.md` (copy of this plan; committed)
- `/home/stk/workspace/engineering/adjutant/terminal-use/package.json`
- `/home/stk/workspace/engineering/adjutant/terminal-use/pnpm-workspace.yaml`
- `/home/stk/workspace/engineering/adjutant/terminal-use/tsconfig.base.json`
- `/home/stk/workspace/engineering/adjutant/terminal-use/eslint.config.js`
- `/home/stk/workspace/engineering/adjutant/terminal-use/.github/workflows/ci.yml`
- `/home/stk/workspace/engineering/adjutant/terminal-use/.github/workflows/conformance.yml`
- `/home/stk/workspace/engineering/adjutant/terminal-use/.github/workflows/release.yml`

**`@colgate/core`**
- `packages/core/src/{index,terminal,session,pty,parser,snapshot,keys,waits,events,errors}.ts`
- `packages/core/src/util/{abort,hash,time}.ts`
- `packages/core/src/internal/color.ts`
- `packages/core/test/...`

**`@colgate/map`**
- `packages/map/src/{index,schema,define,runtime,fingerprint,pathfinder,executor,substitution,events}.ts`
- `packages/map/test/...`

**`@colgate/nano`**
- `packages/nano/src/{index,nano,options,cursor,search,replace,save,file-browser,buffers,macros}.ts`
- `packages/nano/src/subsessions/{spell,lint,format}.ts`
- `packages/nano/src/map/{index,9.x,8.x,7.x}.ts`
- `packages/nano/test/{unit,replay,conformance}/…`

**`@colgate/htop`**
- `packages/htop/src/{index,htop,options,process-list,meters,setup}.ts`
- `packages/htop/src/subsessions/{strace,lsof,ltrace}.ts`
- `packages/htop/src/generated/{display-options-3.5,meters-3.5,columns-3.5,color-schemes-3.5}.ts`
- `packages/htop/src/map/{index,3.5.x,3.4.x,3.3.x}.ts`
- `packages/htop/scripts/gen-options.ts`
- `packages/htop/test/{unit,replay,conformance}/…`

**`@colgate/recorder`**, **`@colgate/inspector`**, **`@colgate/testing`**, **`@colgate/cli`**
- Each with `src/`, `test/`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`

**Fixtures & Docker**
- `fixtures/nano/{7.2,8.0,9.0}/*.cast` + `*.meta.json`
- `fixtures/htop/{3.3.0,3.4.0,3.5.0}/*.cast` + `*.meta.json`
- `fixtures/docker/{nano,htop}/Dockerfile.*`
- `fixtures/docker/build.sh`

**Examples**
- `examples/{nano-basic,htop-kill-cpu-hog,custom-agent-loop}.ts`
- `examples/embed-in-tauri/…`

**Docs**
- `docs/` (VitePress site, content in `docs/src/`)

---

## 20. Reuse — what already exists that we must not rewrite

| Need | Reused dependency | Why |
|---|---|---|
| PTY spawn / IO / resize / signals | `node-pty` (Microsoft) | Production-grade, the one VS Code uses |
| VT state engine / ANSI parser / grid | `@xterm/headless` | Same parser as VS Code terminal; full VT + addons |
| ANSI serialization for fixtures | `@xterm/addon-serialize` | Round-trip-safe dump |
| Unicode 11 width tables | `@xterm/addon-unicode11` | CJK / emoji correctness |
| Schema + types in one | `zod` | `z.infer` gives types; no duplication |
| Test runner + matchers | `vitest` | Fast, ESM-native |
| Build | `tsc --build` + `tsup` (only where bundling needed) | Standard |
| Monorepo | `pnpm` workspaces + `changesets` | Standard |
| Asciicast replay fixture format | [asciinema cast v2](https://docs.asciinema.org/manual/asciicast/v2/) | Standard, tool-friendly |
| Docs | VitePress + TypeDoc | Standard |

We write everything else from scratch: map runtime, fingerprint matcher, pathfinder, key encoder, premium modules, recorder, inspector, CLI.

---

*End of plan.*
