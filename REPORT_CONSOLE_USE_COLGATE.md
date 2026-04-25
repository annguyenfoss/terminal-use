# The 2026 Console Stack for Web & macOS Desktop Developers

Scope: what developers shipping web apps (JS/TS fullstack) and macOS desktop apps (Swift native + cross-platform) actually live in at the terminal, as of April 2026. Primary focus: macOS, with Linux where relevant. No 101 material.

---

## 1. The Terminal Substrate

### 1.1 Emulators

| Tier | Tool | Status | Notes |
|---|---|---|---|
| **Dominant** | **Ghostty** | 1.0 Dec 2024, 1.3 Mar 2026 | Hashimoto's Zig-written, AppKit/GTK4-native client. ~45k stars in year one. Most standards-compliant xterm clone ever (Kitty keyboard + graphics protos, OSC 133, Unicode 17). 4× faster plain-text reads than iTerm2/Kitty. Dec 3, 2025: moved to Hack Club 501(c)(3) to rug-pull-proof. Missing: broadcast input, Windows. |
| | **iTerm2** | Still entrenched | AI integration added 2023–2024 but feels bolted on next to Warp. |
| | **Warp 2.0** | June 2025, rebranded "ADE" | TIME Best Inventions 2025. Parallel agents, checkpoints, block model. ~300 MB RAM (6× Ghostty). Account login no longer mandatory (Dec 2024). Telemetry + block model still break some TUI/Claude-Code workflows. |
| **Rising** | **Wave Terminal** | Active | Block UI: terminal, file preview, browser, AI chat as draggable panes. Niche for graphical panes without Warp's lock-in. |
| | **WezTerm** | Slipping | Lua-config, built-in multiplexer. Still the only mainstream emulator that merges emulator+mux. Lost ground to Ghostty on mac. |
| | **Alacritty 0.16** | Stable | GPU-rendered minimalist; scripting is still external. |
| **Incumbent** | **Kitty** | Active | Graphics protocol originator; Python-config keeps a devoted base. |
| **Dead/Fading** | Hyper, Apple Terminal.app, xterm, urxvt | — | Hyper effectively abandoned. |

### 1.2 Shells

- **Zsh** — macOS default, the pragmatic choice. With `zsh-autosuggestions` + `zsh-syntax-highlighting` + `fzf-tab` it's competitive with Fish.
- **Fish 4.0** (Feb 2025) — the **Rust rewrite** landed. Same fish UX, dramatically faster startup, better concurrency. If you're starting fresh in 2026, Fish 4.x is the default recommendation for interactive use.
- **Nushell** (0.100+ in 2026) — structured-data shell, serious cohort of backend/devops users pipe JSON/CSV/SQLite through it natively. Not a daily driver for most; great as a second shell for data wrangling.
- **Bash** — scripting only; dead for interactive use on any modern box.
- **PowerShell 7.6** — Windows/cross-platform; mac adoption mostly Azure/DevOps.

### 1.3 Prompts

- **Starship** — dominant. Rust, cross-shell, one TOML, instant start. Default in most 2026 dotfiles.
- **Powerlevel10k** — life support. Still beautiful but maintainer signalled slowdown.
- **Pure / Spaceship / oh-my-posh** — niche / Windows-flavored.

### 1.4 Multiplexers

- **tmux 3.6** still the default. Config friction is its only liability.
- **Zellij 0.42+** — layouts-as-config, floating panes, built-in welcome screen. The one the junior devs learn first now.
- **sesh / tmuxinator** — session launchers; `sesh` (Go, fzf-based) is the modern pick.
- **GNU Screen** — deprecated in RHEL 8+; move on.
- **Ghostty's native splits** are decent but not a tmux replacement because they don't detach.

### 1.5 Fonts
JetBrains Mono (free) dominant; Berkeley Mono (paid) and Iosevka rising; Menlo/Monaco are legacy.

---

## 2. Modern Unix: The Rust Renaissance

The 2025–2026 story: **Rust ate the Unix utility layer**. Ubuntu 25.10 shipped uutils (Rust coreutils) by default; 26.04 LTS codifies it. Every AI coding agent (Claude Code, Codex, Cursor, Copilot CLI, Gemini, aider) shells out to `rg` and `fd` — they are now **infrastructure**, not preferences.

### 2.1 Listing / Navigation

| Modern | Replaces | Notes |
|---|---|---|
| **eza** (21.5k★) | `ls`, `exa` | Git column, icons, themes. Don't alias in scripts. |
| **lsd** | `ls` | Closer drop-in; eza is the community default now. |
| **fd** (42.7k★) | `find` | Respects `.gitignore`, parallel. On Debian the binary is `fdfind`. |
| **broot** | `tree`+`cd`+`find` | Interactive fuzzy tree with `br` cd-integration. |
| **erdtree** | `tree`+`du` | Multi-threaded gitignore-aware tree. |
| **zoxide** | `cd` | Frecency DB. `z foo` jumps. Universal 2026 install. |
| **yazi** | ranger | Async TUI file manager in Rust. Replaced ranger/nnn in most 2026 dotfiles. |
| **exa** | — | **Dead** (archived 2021). Use eza. |

### 2.2 Search

Three layers: **text → AST → semantic**.

- **ripgrep** (62.9k★) — SIMD + gitignore + parallel. Uncontested. Default hides hidden/ignored; `rg -uuu` to "act like grep".
- **ast-grep** (`sg`, 13.6k★) — tree-sitter pattern matching. YAML lint rules. Name conflicts with util-linux `sg`.
- **jq / jaq / yq / gron / fx** — jq remains, jaq (Rust rewrite) is faster, `yq` for YAML, `gron` flattens JSON for grep, `fx` is the interactive TUI.

### 2.3 Viewing / Diffing

- **bat** — `cat` + syntax + git gutter.
- **delta** — pager for `git diff`; most dotfiles wire it via `core.pager`.
- **difftastic** — AST-aware structural diff. Slower than delta but catches moved blocks.
- **lnav** — logfile pager with SQL; essential for reading server logs locally.
- **tailspin / hl** — real-time log colorizers for `tail -f`.

### 2.4 Monitoring / System

- **btop** — top/htop replacement with GPU support. Dominant.
- **bottom** (`btm`) — Rust alt, terminal-friendly configs.
- **procs** — `ps` replacement.
- **dust** — `du` replacement.
- **duf** — `df` replacement.
- **hyperfine** — statistical benchmarking; the one every blog post uses.

### 2.5 Network / HTTP

- **xh** (Rust, httpie-compatible syntax) — the 2026 default over `httpie` itself, because `httpie` became a hosted product.
- **curlie** — curl with httpie-style sugar; the "I still want curl flags" pick.
- **hurl** — text-file HTTP test runner; CI-friendly.
- **doggo** — DNS client, drop-in for `dig`.
- **trippy** — modern `mtr`.

### 2.6 Shell glue

- **fzf** — still the king. `fzf-tab` for Zsh makes autocompletion a fuzzy finder.
- **skim** (`sk`) — Rust alt, slightly faster, worse ecosystem.
- **atuin** — replace your shell history with a SQLite-backed searchable one; optional end-to-end-encrypted sync.
- **watchexec** — "run X when files change" without Nodemon/entr flakiness.
- **just** — Makefile replacement for task running; universal 2026 install.
- **mise** (formerly rtx) — polyglot version manager. **Replaces asdf, nvm, pyenv, rbenv, fnm, goenv, tfenv** — all at once.
- **chezmoi** — dotfile manager with templating + secret binding; replaces bare-git and yadm.
- **sd** — better `sed` for the find-and-replace 80%.
- **choose** — `awk '{print $3}'` → `choose 2`.

---

## 3. Web Developer Stack (JS/TS)

### 3.1 Runtimes

| Runtime | State (Apr 2026) | Use when |
|---|---|---|
| **Node 24 (Active LTS)** | Native TS type-stripping, `--watch`, `--run`, `node:test`, `node:sqlite` stable, `node --permission` | **Default for production**. Closed most of the Bun/Deno feature gap. |
| **Node 22 (Jod, Maintenance Apr 2025 → EOL Apr 2027)** | — | Only if pinned. |
| **Deno 2.6** | `npm:` specifiers, JSR registry, `deno publish` workspace-aware, `deno dx` (the new npx). LTS channel for enterprise. | Tooling authors, edge workers, TS-first libs. |
| **Bun 1.3** | Fast runtime + bundler + package manager + test runner + SQLite. Node-compat is excellent but not 100%. | Dev-tooling speed, monorepo scripts, side projects. Still rough for some production workloads. |

Pragmatic read: **Node 24 wins for production**, Bun wins for dev-server/tooling speed, Deno wins for standalone TS libraries published to JSR.

Key Node 24 details:
- Native TypeScript type-stripping is **stable, no flag required** for erasable TS (`node src/index.ts` just works). Non-erasable syntax (enums, experimental decorators with emit, param-properties) still needs `--experimental-transform-types`. No type-checking — use `tsc --noEmit` or `tsgo` for that.
- `--watch` debounced restart replaces nodemon for most cases.
- `--run <script>` runs `package.json` scripts without npm startup tax (~200ms saved). Does NOT traverse up workspace tree — deliberate.
- `node:test` + `node:assert` full parallel test runner with coverage, snapshots, TAP/spec reporters.
- `node:sqlite` RC in Node 25, stable in 24.x line behind `--experimental-sqlite`. Sync API modeled on `better-sqlite3`.
- `node:glob` stable in 24.
- `fetch`/`Request`/`Response`/`FormData`/`WebSocket` client stable. `WebSocketStream` shipped in 24.
- `node --permission` stable in 24 — file/net/child-process allowlists, opt-in.

Deno 2.x (2.0 Oct 2024 → 2.6+ late 2025) highlights:
- `package.json` and `node_modules` recognized natively; `npm:` specifiers; `deno install/add/remove` behave like npm.
- **JSR (jsr.io)** — TS-native registry. Packages publish as TS source (no build step). JSR re-exports to npm under `@jsr/` scope.
- `deno publish` walks workspace members.
- Node-API native addons work with local `node_modules/` (`nodeModulesDir: "auto"`).
- `deno dx` (Deno 2.6) — "dx is the new npx".
- Built-in LTS channel for enterprise.

### 3.2 Package Managers & Monorepo

- **pnpm (10.x, catalogs)** — dominant. Workspace catalogs unified version management in 2025 and killed the need for most Renovate config.
- **npm** — fine, slow, hasn't innovated.
- **Yarn (Berry)** — minority.
- **bun install** — 10× pnpm on cold install but lockfile drift concerns linger.
- **Turborepo** — still the build orchestrator; Vercel-owned.
- **Nx** — enterprise-leaning alt.
- **moonrepo** — smaller but growing; polyglot.

### 3.3 Version Managers

- **mise** and **fnm** have displaced **nvm** almost entirely. `nvm` is still the "works on every laptop" fallback but nobody new is choosing it.

### 3.4 Bundlers / Dev Servers / Compilers

| Tool | State |
|---|---|
| **Vite 8** | Ships with **Rolldown** (Rust Rollup) as default bundler in 2026. Dev server still esbuild + SWC. Dominant. |
| **Rspack 1.x** | Rust webpack-compatible. Shops with webpack configs migrate here, not to Vite. |
| **Turbopack** | Default in **Next 16**. Outside Next, niche. |
| **esbuild** | Still indispensable as a library (Vite, tsup, others). |
| **tsgo / TypeScript 7 (native Go compiler)** | Microsoft's Go port of tsc. Stable-ish in 2026; ~10× `tsc --noEmit` on large repos. Use for type-check step in CI. |
| **Biome 2** | Formatter + linter, `eslint-plugin-*` compat layer. Replacing Prettier + ESLint in new projects. |
| **Oxlint** | Rust, blazing lint only. Pairs with Biome format. |
| **SWC** | Under the hood of Next, Parcel, Vitest. Library, not CLI. |

### 3.5 Testing

- **Vitest 4** — the default for unit/integration in Vite projects.
- **Playwright** — default for E2E. `playwright test` + trace viewer are canonical.
- **Storybook 9** — component testing now baked into Vitest integration.
- **node:test** — viable for zero-dep libs.
- **Jest** — maintenance; legacy.

### 3.6 Frameworks (CLI surface)

- **Next 16** (Turbopack default) — `next dev`, `next build`, `next start`.
- **TanStack Start** — rising; full-stack TS-first framework with file-based routing.
- **SvelteKit**, **Nuxt 4**, **Remix → React Router 7** — holding.
- **Astro 5** — content sites.

### 3.7 Databases (ORMs and migrations in terminal)

- **Drizzle** — `drizzle-kit generate/migrate/studio`. **Acquired by PlanetScale** in 2025; still OSS. Dominant.
- **Prisma 7** — rewrite in TypeScript, no more Rust query engine. Performance parity with Drizzle.
- **Kysely** — query builder, no migrations of its own.
- **dbmate / Atlas** — schema-migration-as-CLI, framework-agnostic.

### 3.8 Deploy CLIs

- **Wrangler 4** (Cloudflare) — dominant edge deploy CLI.
- **SST Ion** — Pulumi-backed, TS-native AWS deploy.
- **Supabase CLI** — local Postgres + edge function dev.
- **Vercel CLI**, **Netlify CLI**, **Fly flyctl**, **railway**, **render** — all daily drivers per stack.
- **gh** — GitHub PR/issue CLI is now part of most devs' shell muscle memory.

---

## 4. macOS Desktop Developer Stack

### 4.1 Apple Toolchain

- **`xcodebuild`** — Xcode 26 (WWDC 2025) flipped **Explicitly Built Modules** on by default: scanning → modules → compilation. ~40% faster cold opens on large projects. **Swift Build** (the engine) is now open source, which rules_swift and Tuist lean on. Day-to-day CI line: `xcodebuild -scheme X -destination 'generic/platform=macOS' -configuration Release -derivedDataPath build archive` piped through a formatter. `-only-testing:` / `-skip-testing:` + `-parallel-testing-enabled YES` are the bread-and-butter CI knobs. `-resultBundlePath` feeds the xcresult pipeline.
- **`xcrun simctl`** — only supported way to drive the simulator since ~2018. `simctl boot`, `simctl launch --console-pty`, `simctl io booted recordVideo`, `simctl push` for test pushes, `simctl privacy` / `simctl status_bar` for deterministic screenshots, `simctl pbcopy/pbpaste`. `ios-sim` and `ios-deploy` are essentially moribund.
- **`xcrun devicectl`** — replaces `ios-deploy` for iOS 17+ physical devices. `xcrun devicectl device process launch --device <UDID> <bundleID>`.
- **`xcrun notarytool`** — **altool notarization submissions stopped accepting Nov 1, 2023** (TN3147). `notarytool store-credentials` stashes an app-specific password or ASC API key in the keychain; `notarytool submit foo.zip --keychain-profile AC_PROFILE --wait` is the canonical one-liner. Then `xcrun stapler staple foo.app` and `spctl --assess -vvv --type exec foo.app` to verify.
- **`xcrun xctrace`** — replaces old `instruments` CLI (deprecated but still present). `xctrace record --template 'Time Profiler' --launch -- /path/to/app` produces a `.trace` bundle.
- **xcresult parsing** — Xcode 16 changed the schema. `xcresulttool get build-results` / `get test-results`; legacy gated behind `--legacy`. Tool winners:
  - **xcresultparser** (a7ex) 1.7.0+ — Xcode 16/26 compatible; multi-format output (txt/xml/html/JUnit/cobertura/sonar). Best for CI coverage upload.
  - **xcparse** (ChargePoint) 2.3.2 added `--legacy` — specializes in screenshots + coverage from `.xcresult`.
  - **xchtmlreport** — standalone HTML rendering, slower to keep pace.
  - **trailblazer** — niche, not commonly used.
- **`xcbeautify`** (cpisciotta) — replaces `xcpretty` (dead since 2018). Swift-native, faster. Default formatter in fastlane 2.20.1.0+, Firebase iOS SDK, Bitrise. `xcodebuild ... | xcbeautify --renderer github-actions` is the modern CI line. `set -o pipefail` matters because xcbeautify swallows xcodebuild's exit code otherwise.
- **`xcodes`** (XcodesOrg) — the `nvm` of Xcode. `xcodes install 16.3 && xcodes select 16.3`. Has a companion Xcodes.app. Replaces the abandoned `xcode-install` gem.

### 4.2 Swift / SPM

- **Swift 6.2** (2025) — **Approachable Concurrency** mode: opt-in stricter actor isolation by default without forcing full Swift 6 migration pain. Most app targets enable incrementally.
- **Swift Package Manager (SPM)** — dominant dependency manager; CocoaPods is in palliative care; Carthage effectively dead.
- **swift-format** (Apple, in-tree) — now shipped with the toolchain.
- **SwiftFormat** (Nick Lockwood) — still more configurable, still wider adoption.
- **SwiftLint** (Realm/community) — style linter; Swift-Syntax-based. Pre-commit hook canonical.

### 4.3 Project Generation / Build Alternatives

- **Tuist 4** — dominant. Declarative Xcode project generation in Swift; caching/remote-cache; incremental CI huge-repo wins.
- **XcodeGen** — YAML, simpler but maintenance-mode.
- **Bazel + rules_swift** — only at FAANG scale. New 2025+ rules_swift versions leverage Swift Build.

### 4.4 Distribution

- **Sparkle 2.9** — the OSS macOS auto-updater. EdDSA signing now required.
- **codesign / productbuild / notarytool / stapler** — the notarization chain. Every shipping app knows this by heart.
- **Homebrew 5.0** — casks and bottles, dominant install path.
- **mas 4.0** (Mac App Store CLI) — now requires root. CI implications.
- **altool** — dead for notarization, dying for App Store upload (Transporter / `xcrun altool --upload-package` still works but ASC API is preferred).

### 4.5 Mise en place

- **mise** has replaced **Mint** for most Swift tool management (SwiftLint, SwiftFormat, xcbeautify, xcodes, sourcery).

### 4.6 Cross-Platform Desktop

- **Tauri 2.0** — Rust core, any-frontend. Dominant OSS Electron alternative. Mobile support added 2024.
- **Electron** — still huge; **Electron Forge** officially-blessed, `electron-builder` for heavier needs. Chromium bloat reality unchanged.
- **Flutter macOS** — viable; mostly used when iOS/Android are primary.
- **react-native-macos** — Microsoft-maintained; niche.
- **Wails** — Go + webviews; growing in Go-heavy shops.

---

## 5. AI Coding CLIs — The 2026 Category

Three macro facts:

1. **Claude Code ate the category.** $2.5B run rate, 300K+ business customers by early 2026. JetBrains survey: 46% "most loved" vs Cursor 19% vs Copilot 9%. Fastest reversal in dev-tooling history.
2. **MCP is the new USB-C.** Anthropic's Model Context Protocol (Nov 2024) now has 10,000+ public servers and ~97M monthly SDK downloads. Native support in Claude Code, Cursor, Zed, Cline, Copilot CLI, Gemini CLI, Qwen Code, Crush, Continue, Warp, Kiro. OpenAI, Google, Microsoft, Amazon all ship it.
3. **Agents > completions.** The category moved from inline autocomplete (Copilot-style) to plan→execute→verify loops with parallel subagents and cloud-hosted worktrees. The frontier model matters less than it did — the same Opus 4.7 or GPT-5.3-Codex is available to Cursor, Zed, Cline, Aider. The **scaffold** (tool orchestration, context management, hooks, permissions) is the differentiator.

### 5.1 The Matrix

| Tool | Launch | Default Model | Subagents | Worktrees | Hooks | MCP | License | Base Price |
|---|---|---|:-:|:-:|:-:|:-:|---|---|
| **Claude Code** | Feb 2025 GA | Opus 4.7 / Sonnet 4.5 | 7-parallel | Built-in `/worktree` | 12 events | Client+Server | Closed | $20 Pro / $100 Max5 / $200 Max20 |
| **Codex CLI** | Apr 2025 | GPT-5.3-Codex → GPT-5.5 (Apr 23 2026) | Cloud parallel | Yes | Limited | Partial | Apache | ChatGPT Plus $20 / Pro $200 |
| **Cursor CLI** | Aug 2025 | user-selected | Cloud agents Feb 2026 | Remote agents Apr 2026 | Limited | Client | Closed | $20 / $60 / $200 |
| **Gemini CLI** | Jun 2025 | Gemini 2.5–3.x | Skills preview | Yes | Limited | Client | Apache | Free 60 RPM / 1k RPD |
| **Kiro** (ex-Amazon Q, Nov 17 2025 rename) | Nov 2025 | Claude on Bedrock | CLI 2.0 (Apr 2026) | Yes | Yes | Client | Closed | Free + AWS |
| **Aider** | 2023 | any (Opus 4.5 polyglot leader) | architect+editor | manual | — | via ext | Apache | free, BYO key |
| **OpenCode** (sst) | 2024 | 75+ providers | Yes | Remote Docker (workspaces WIP) | Yes | Both | Apache | free |
| **Cline** | 2024 | user-selected | v3.58 native | CLI 2.0 | Yes | Client | Apache | free ext + BYO |
| **Crush** (Charm) | 2025 (Mods successor; sunset Mods Mar 9 2026) | user-selected | Yes | — | hooks | Client | Apache | free |
| **Plandex** | 2024 | multi | branched plans | native branches | limited | Client | AGPL | free self-host |
| **Qwen Code** | Jul 2025 | Qwen3-Coder (69.6 SWE-V) | Yes (Gemini fork) | inherited | partial | Client | Apache | free + DashScope |
| **Continue CLI (`cn`)** | 2025 | user + Grok Code Fast | Yes | Yes | CI/CD hooks | Client | Apache | free + BYO |
| **Copilot CLI** | GA Apr 2026 | Sonnet 4.5 / GPT-5 | `/fleet` | — | Yes | Client | Closed | $10 / $19 / $39 |
| **Factory Droid** | 2025 | Opus 4.1 / GPT-5 / Sonnet 4 ensemble | Yes | Yes | Yes | Client | Closed | enterprise |

Architectural notes:
- Claude Code's parallel-agent cap is **7**.
- Cursor Composer's parallel count scales with the plan.
- OpenCode's client/server split is the architectural bet — only OSS tool that can natively run a session in a remote Docker container without third-party orchestration.

Benchmark shorthand (SWE-bench Verified, April 2026): Claude Mythos 93.9%, Opus 4.7 87.6%, GPT-5.3-Codex 85%, Qwen3-Coder 69.6%. **Terminal-Bench 2.0** became the standard agent benchmark late 2025. **Aider Polyglot** remains the reference for multi-language editing.

### 5.2 Shell-Native Helpers (glue, not agents)

- **llm** (Simon Willison) — `llm -m gpt-5 "..."`, plugins everywhere, SQLite log of every prompt.
- **Mods** — **sunset March 9, 2026**, replaced by **Crush** (Charm).
- **sgpt / aichat / tgpt** — smaller niches; tgpt hits free endpoints without an account.

### 5.3 Choosing

- **Single-repo serious work**: Claude Code. Plain and simple in 2026.
- **Tight OpenAI budget / already Plus subscriber**: Codex CLI.
- **Open-source / self-hosted-friendly**: OpenCode, Cline, Aider, Plandex.
- **CI-integrated headless**: Continue (`cn`).
- **GitHub-first shops**: Copilot CLI (post–Apr 2026 GA).

---

## 6. DevOps / Container / Cloud / Deploy

### 6.1 Container Runtimes on macOS

The biggest shift of the period. Docker Desktop's bleed + Feb 2022 commercial licensing drove mass migration.

| Tool | Use | Momentum |
|---|---|---|
| **OrbStack** | Swift-native VM, ~2s cold start, <300MB RAM idle. Paid for biz ($8/user/mo). **4.5× less RAM, 5–10× faster FS** vs Docker Desktop on M-series. | Rising hard |
| **Colima** | OSS Lima wrapper. `colima start --kubernetes` = Docker + k3s. Free. | Stable/rising |
| **Lima** | Underlying VM engine; Colima and Finch are downstream. | Stable |
| **Docker Desktop** | 2GB+ RAM, 30–60s cold start. Still default for Win/Linux parity. | **Fading on macOS** |
| **Finch** (AWS) | Lima + nerdctl + containerd + BuildKit. v1.4 added devcontainers on mac/Win/Linux. | AWS-regulated niche |
| **Rancher Desktop** (SUSE) | OSS, runtime + containerd + built-in k3s. Apache-2.0, no employee cap. | Stable |
| **Podman Desktop** (Red Hat) | Daemonless, rootless, pods semantics. | Stable |
| **devcontainer CLI** | Spec reference impl. DevPod/Codespaces/JetBrains driver. | Rising |

Install notes: `brew install orbstack` (cask), `brew install colima docker docker-compose`, `brew install --cask rancher` or `podman-desktop`, `npm i -g @devcontainers/cli`.

### 6.2 Kubernetes

- **kubectl** + **kubecolor** (colorize), **stern** (multi-pod logs), **kubectx/kubens** (context/ns switch), **k9s** (TUI — universal).
- **kind / k3d / minikube** — local clusters. k3d leads for speed.
- **Helm** — still the lowest-common-denominator chart format.
- **ArgoCD vs FluxCD** — Argo owns GitOps adoption; Flux for CNCF-purist shops.
- **Kustomize** — baked into kubectl; heavy usage.
- **cilium CLI**, **istioctl**, **linkerd** — service-mesh admin.

### 6.3 IaC

- **OpenTofu** — the Terraform fork post-IBM/HashiCorp (closed late 2024). Drop-in; many orgs migrated in 2025. State-encryption added in OpenTofu 1.8+.
- **Terraform** — still around, BSL license; Enterprise + Cloud are the commercial pull.
- **Pulumi** — TS/Python/Go IaC; strong in developer-first shops.
- **Ansible** — holding in ops-heavy orgs, adding less over time.

### 6.4 Platform / Build

- **Dagger** — programmable CI/CD engine. **Earthly sunset July 2025**; Dagger ate its market. Runs in any CI.
- **act** — run GitHub Actions locally.
- **just** (yes again) — universal task runner.

### 6.5 Secrets

- **sops + age** — open default for repo-committed secrets.
- **1Password CLI (`op`)** — macOS-native, easy inject via `op run`.
- **Doppler**, **Infisical** — hosted secret-ops.
- **OpenBao** — Vault fork (post-HashiCorp licensing change); CNCF incubation.

### 6.6 Dev Environments

- **devenv 2.0** (Nix-based) — reproducible per-project envs. Rising fast in 2025–2026.
- **mise** — still wins if you don't need Nix-purity.
- **nix flakes** — still painful but powerful.

### 6.7 Load & Perf

- **k6** (Grafana) — scripted load testing.
- **oha** — hey/wrk replacement in Rust.
- **hyperfine** — micro-benchmarking.

---

## 7. Git / Database / Observability

### 7.1 Git Itself

- **Git 2.43 (Nov 2023) → 2.48 (Jan 2025) → ~2.52 (late 2025)**. Multi-release theme: **reftable** — binary ref backend that replaces loose/packed-refs (Gerrit/JGit had it for years). Preliminary reftable support landed in 2.45; 2.46 added `git refs migrate`; 2.47 hardened concurrent writers; 2.48 added reflog migration and made reftable independent of libgit.a.
- Other 2024–2025 highlights: moved to **Meson** alongside Make (2.48); all in-tree memory leaks eliminated; `git for-each-ref` gained mailmap support (2.43); faster `git stash`; improved `git sparse-checkout` reliability (essential for monorepos); progress on SHA-256 interop. `--update-refs` on rebase matured; partial-clone improved.
- **Practical**: on a new monorepo, `git init --ref-format=reftable` is worth a try. Enable `feature.manyFiles=true` and `core.fsmonitor=true` for IDE-scale repos.

### 7.2 Alt VCS

| Tool | Origin | Status | Notes |
|---|---|---|---|
| **Jujutsu (jj)** | Google / Martin von Zweigbergk | ~27k★, 0.28–0.32 in 2025. Strong momentum. | Rust, Git backend — writes `.git` so teammates keep using git. Everything is a commit (no staging area), conflict-as-first-class, `jj undo`, anonymous branches. 0.29 sent change IDs over Git; 0.30+ added zlib-rs, smarter rebase divergence detection, improved `jj split`. **The only realistic Git successor by adoption.** |
| **Sapling (sl)** | Meta (2022 OSS) | Stalled outside Meta | Mercurial descendant. Smartlog, undo, stacked diffs via ReviewStack. GitHub bridge is awkward. Pilots, not production, outside Meta. |
| **Pijul** | Research | Niche | Patch-theory, CRDT-style merges. Not operationally viable. |
| **Fossil** | D. R. Hipp (SQLite) | Niche but stable | All-in-one (repo+wiki+issues) SQLite-backed. SQLite devs still use it. |
| **gitoxide (gix)** | Rust-lang | Library, partial CLI | Pure-Rust reimplementation of git plumbing. Powers Cargo's vendored fetching. |

Verdict: **jj is the one to watch**; Sapling is a cautionary tale about requiring server rewrites.

### 7.3 Git TUIs

| Tool | Lang | Strength | Weakness |
|---|---|---|---|
| **lazygit** | Go (gocui) | Best ergonomics — hunks, interactive rebase, cherry-pick, worktrees in one screen. Duffield marked 5 years 2025. | Less scalable on huge repos. |
| **gitui** | Rust | Fastest; async blame/log; handles 100k+ commits smoothly. | Fewer features; no interactive rebase editor. |
| **tig** | C (ncurses) | Incumbent (since 2006); excellent log/blame browser. | Dated UX; no staging UI. |
| **gitu** | Rust | Magit-inspired keybindings. | Small user base; feature gaps. |

Who uses what: lazygit dominates new-user installs (~15k brew/yr vs tig ~8k); gitui wins for Rust fans + mega-repos; tig lingers on greybeard servers; gitu is the "I miss Magit but can't run Emacs" crowd.

### 7.4 Diff & Review

- **delta** — git-diff pager; canonical.
- **difftastic** — AST-aware; great for renames and refactors.
- **GitHub CLI `gh`** — universal.
- **glab** (GitLab), **tea** (Gitea), **hut** (SourceHut) — vendor-specific peers.

### 7.5 Stacked PR Workflow

- **Graphite** (hosted SaaS + `gt` CLI) — dominant stacked-PR workflow in 2025+.
- **spr**, **ghstack** (Meta), **git-branchless**, **git-town** — OSS alternatives.
- **GitButler** — virtual branches, novel UX, decent adoption among solo devs.

### 7.6 Hooks / Security

- **lefthook** — Go, fast, polyglot. Has displaced Husky in many 2025+ projects.
- **pre-commit** (Python) — still dominant for polyglot monorepos.
- **gitleaks** + **trufflehog** — secret scanning in CI and local hooks.
- **sigstore gitsign** — keyless commit signing; enterprise adoption growing.

### 7.7 Database CLIs

- **psql** — still baseline. **`pgcli`** (Python) with autocomplete + syntax highlight is a daily driver. **`pspg`** is the go-to pager for wide tables.
- **pg_duckdb** — embed DuckDB inside Postgres; 2025 darling for analytical queries next to operational data.
- **DuckDB 1.2 LTS** — CLI is the analytical workhorse; reads parquet/CSV/JSON/S3 natively.
- **Harlequin** — TUI SQL IDE; works across Postgres/DuckDB/SQLite/Snowflake.
- **usql** — Go-based universal SQL client, many backends.
- **Valkey** — Redis fork (after Redis's 2024 license change). Most package managers now ship valkey-cli as the default.
- **Turso / libSQL** CLI — edge SQLite.
- **Atlas / dbmate / drizzle-kit / prisma migrate** — schema migration CLIs.

### 7.8 Observability (Local)

- **lnav** — SQL over logfiles.
- **tailspin / hl** — realtime colorization.
- **stern** — multi-pod k8s logs.
- **Vector** (Datadog-owned) — Rust log/metric pipeline; runs both as agent and library.
- **Fluent Bit** — embedded log shipper; dominant in k8s.
- **OpenTelemetry Collector** — the standard for trace/metric/log pipelines.
- **Grafana Alloy** — Grafana's OTel distribution; replaces the Grafana Agent.
- **sentry-cli** — source-map upload + release mgmt.
- **asitop** / **powermetrics** — M-series CPU/GPU/ANE profiling on mac.
- **bpftrace** (Linux), **delve** + **rr** (Go/time-travel debug).

---

## 8. Cross-Cutting Trends (2025–2026)

1. **Rust won the system utility layer.** ripgrep/fd/eza/bat/zoxide/sk/hyperfine/difftastic/broot/yazi/atuin/starship are all Rust. Uutils shipping as Ubuntu default in 25.10/26.04 LTS is the symbolic tipping point.
2. **MCP is the new USB-C of AI tooling.** 10k+ servers, ubiquitous support. Custom MCP server per company is now a common pattern for internal-knowledge wiring.
3. **Agents ate the CLI.** Claude Code/Codex CLI/Cursor CLI/Copilot CLI are closer to developer IDEs than to classical CLI tools now. tmux pane = multi-agent cockpit is a standard 2026 setup.
4. **The "single-binary, zero-config, smart-default" pattern won.** Starship > P10k, delta > stock pager, ripgrep > grep, mise > asdf — all match this pattern.
5. **Docker Desktop lost macOS.** OrbStack + Colima took the center.
6. **HashiCorp fork consequences.** OpenTofu (Terraform), OpenBao (Vault), Valkey (Redis), and the move from BSL licenses → OSS forks reshaped multiple categories.
7. **Build tooling compiled to native.** tsgo (TS 7 in Go), Biome/Oxlint (Rust), Rolldown (Rust), Turbopack (Rust), SWC (Rust). The JS-tooling-in-JS era is over.
8. **Notarization + signing got stricter, more CLI-driven.** Apple killed altool notarization Nov 2023; Sparkle EdDSA required; sigstore rising for commits.
9. **Terminal ≠ shell ≠ AI ≠ IDE stopped being separate.** Warp ADE, Wave blocks, Ghostty + Claude Code, and IDE-in-terminal tools like Zed-with-Claude blur what a "terminal" even is.

---

## 9. A 2026 Canon Install Set (macOS, Homebrew)

A defensible "new mac for a web + desktop dev" first-day script:

```bash
# core shell / terminal
brew install --cask ghostty
brew install fish starship tmux zellij

# modern unix
brew install eza fd ripgrep bat delta difftastic zoxide fzf yazi
brew install btop procs dust duf hyperfine jq jaq yq gron fx
brew install xh curlie hurl doggo trippy
brew install atuin watchexec just mise chezmoi sd choose ast-grep lnav tailspin

# version & env
brew install mise          # replaces nvm/asdf/pyenv/rbenv/tfenv/goenv
# then: mise use -g node@24 pnpm@10 bun@1 python@3.13 ruby@3.4

# web dev extras
brew install pnpm bun deno
brew install supabase/tap/supabase
npm i -g wrangler turbo

# macOS desktop
brew install xcodes xcbeautify swiftlint swiftformat tuist sourcery
# mise use -g swift-format@latest

# containers
brew install --cask orbstack            # or: brew install colima docker docker-compose
brew install kubectl kubecolor stern kubectx k9s helm k3d

# git
brew install lazygit gitui gh delta difftastic lefthook gitleaks jj
brew install graphite-dev/tap/graphite  # or: gt

# databases
brew install pgcli pspg duckdb harlequin
brew install valkey                     # replaces redis in most homebrew deps

# iac / secrets / deploy
brew install opentofu pulumi sops age
brew install --cask 1password-cli
brew install doppler infisical-cli openbao

# ai-coding
# Claude Code: npm i -g @anthropic-ai/claude-code  (or native installer)
# Codex CLI:   npm i -g @openai/codex
# Cursor CLI:  curl https://cursor.com/install -fsSL | bash
# Gemini CLI:  npm i -g @google/gemini-cli
brew install llm

# notarization / mac-app shipping
# (already present via Xcode: notarytool, stapler, codesign, productbuild, xcrun)
brew install sparkle
```

Fish + Starship + Ghostty + Zellij + mise + Rust-CLI toolbelt + Claude Code is the modal 2026 power-user daily stack on macOS.

---

## 10. Sources (condensed)

- Ghostty 1.0 / 1.3 / non-profit — mitchellh.com/writing/ghostty-1-0-reflection, ghostty.org/docs/install/release-notes/1-3-0, mitchellh.com/writing/ghostty-non-profit
- Warp ADE launch — warp.dev/blog/reimagining-coding-agentic-development-environment, TIME Best Inventions 2025
- Wave Terminal — docs.waveterm.dev/releasenotes
- Fish 4.0 Rust rewrite — fishshell.com release notes Feb 2025
- Node 24 / 22 release schedule — nodejs.org
- Deno 2 / Bun 1.3 — deno.com/blog, bun.sh/blog
- Vite 8 / Rolldown — vitejs.dev
- TypeScript native port (tsgo) — devblogs.microsoft.com/typescript
- Claude Code stats — Anthropic engineering blog, JetBrains 2026 State of Developer Ecosystem
- MCP adoption — modelcontextprotocol.io, Anthropic/OpenAI/Google docs
- Xcode 26 / Swift Build OSS — WWDC 2025 sessions, swift.org/blog
- altool notarization sunset — Apple Developer TN3147 (Nov 2023)
- OrbStack vs Docker Desktop — sumguy.com/colima-vs-orbstack-vs-docker-desktop, devtoolreviews, fsck.sh/en/blog/docker-desktop-alternatives-2025
- AWS Finch — aws.amazon.com/blogs/opensource/announcing-finch-on-linux-for-container-development, aws.amazon.com/blogs/opensource/enhancing-developer-productivity-finchs-support-for-development-containers-and-the-finch-daemon
- OpenTofu 1.8+ — opentofu.org/blog
- Valkey — valkey.io/blog
- Git 2.45–2.52 release notes — git-scm.com
- Jujutsu — github.com/jj-vcs/jj
- Sparkle 2.9 EdDSA — sparkle-project.org
- Dev Containers — code.visualstudio.com/docs/devcontainers/devcontainer-cli

Report reflects state as of April 2026; version numbers, release dates, and adoption stats were cross-checked via primary sources by the underlying research agents.
