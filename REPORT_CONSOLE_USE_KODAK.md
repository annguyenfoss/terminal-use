# REPORT_CONSOLE_USE_KODAK

Date: 2026-04-24

## Scope

This report answers two separate but related questions:

1. What modern webapp and macOS desktop developers use the console / terminal for.
2. Whether AI coding agents can already replace the need for those developers to personally open and operate terminal sessions.

This is not a claim about replacing developers. It is specifically about replacing direct human terminal use.

## Executive Summary

The terminal is still a core control surface for modern software development.

- For webapp developers, the terminal is the orchestration layer for package management, dev servers, builds, tests, containers, logs, database access, HTTP inspection, CI parity, and deployment tooling.
- For macOS desktop developers, the terminal is all of the above plus Apple-specific build, simulator, device, signing, notarization, and profiling workflows.
- AI coding agents can already replace a large share of manual command driving for routine, verifiable workflows.
- AI coding agents do not replace the underlying CLI toolchain. They drive it.
- AI coding agents do not yet sufficiently replace the need for serious developers to ever open a terminal again.

The word `ever` is the key. It sets a very strong bar. Current agents can hide the terminal for many tasks, but not enough to remove the terminal as a fallback, inspection surface, debugging instrument, recovery tool, and precision interface.

## Method And Evidence

This report is based on:

- Stack Overflow Developer Survey 2025 for current usage prevalence.
- Stack Overflow Developer Survey 2024 for desktop-framework prevalence.
- JetBrains Developer Ecosystem 2024 for browser-vs-desktop execution context.
- Official docs for Apple, OpenAI, Anthropic, OpenHands, OpenClaw, Docker, Vite, Next.js, Playwright, Swift, and Git.
- Terminal-Bench 2.0 for current benchmark evidence on terminal-task automation.
- METR studies for real-world caveats on agent performance and mergeability.

Important limits:

- General developer surveys measure broad usage well, but not power-user shell tools like `tmux`, `fzf`, `jq`, `rg`, `fd`, `bat`, or `htop` especially well.
- Product docs are good evidence for what the workflow surface is intended to support, but not proof that the workflow is fully reliable in production.
- Benchmarks measure capability, not full real-world sufficiency.

## Part I: What Developers Use The Terminal For

### The Real Role Of The Terminal

For modern developers, the terminal is usually not the primary text editor. It is the universal execution and inspection layer around the editor.

Its main jobs are:

- start the actual runtime
- run the canonical build and test commands
- operate containers and local infrastructure
- inspect logs and live system state
- perform repeatable release steps
- access remote systems through the same command surface used by CI and servers
- compose ad hoc, exploratory commands that are faster than building a GUI flow

This is why terminal use persists even in teams that primarily code inside GUI editors.

### Survey Signals: The Terminal Remains Mainstream

From Stack Overflow 2025, among professional developers:

- `Bash/Shell`: `48.8%`
- `Visual Studio Code`: `76.2%`
- `Vim`: `24.0%`
- `Neovim`: `13.6%`
- `Nano`: `11.3%`
- `Xcode`: `10.6%`
- `Claude Code`: `10.0%`

Interpretation:

- The modern default is not terminal-only.
- It is also not GUI-only.
- The dominant pattern is GUI editor plus terminal.

### Browser And Desktop Context Both Matter

JetBrains Developer Ecosystem 2024 reports:

- `58%` of developers run code on browser platforms.
- `53%` run code on desktop platforms.

Interpretation:

- Both webapp and desktop development are large, current, mainstream domains.
- Any answer about terminal usage that focuses only on web tooling or only on native app tooling is incomplete.

## Webapp Developers: What The Terminal Is Used For

### 1. Project Bootstrap And Dependency Management

Typical jobs:

- create a new app
- install dependencies
- switch runtimes or environments
- add/update/remove packages
- reproduce CI or teammate setup locally

Typical tools:

- `npm`
- `pnpm`
- `yarn`
- `pip`
- `composer`
- `maven`
- `gradle`
- `brew`
- `apt`

Current prevalence signal from Stack Overflow 2025 professional developers:

- `npm 59.3%`
- `pip 39.4%`
- `Homebrew 26.9%`
- `Yarn 23.1%`
- `pnpm 14.2%`
- `Maven 16.9%`
- `Gradle 14.8%`
- `Composer 11.4%`
- `APT 17.3%`

Why the terminal matters here:

- package managers are command-first
- lockfile and install behavior are easiest to inspect from CLI output
- this is the same interface used in CI

### 2. Inner-Loop Development

Typical jobs:

- start the frontend dev server
- start the backend server
- start workers, queues, or background processes
- watch files and rebuild on change
- switch modes and environment variables quickly

Typical tools:

- `vite`
- `next dev`
- `npm run dev`
- framework-specific dev commands

Official examples:

- Vite documents `vite`, `vite build`, and `vite preview` as its core CLI flow.
- Next.js documents `create-next-app`, `next dev`, `next build`, `next start`, and `eslint` as standard scripts.

Current prevalence signal from Stack Overflow 2025 professional developers:

- `Vite 27.2%`
- `Webpack 20.3%`
- `Node.js 49.1%`
- `React 46.9%`
- `Next.js 21.5%`
- `Express 20.3%`
- `Angular 19.8%`
- `Vue.js 18.4%`
- `FastAPI 15.1%`
- `Spring Boot 15.6%`

Why the terminal matters here:

- the dev server is usually launched and watched from CLI
- stdout/stderr is often the first debugging surface
- environment switching is low-friction in shell form

### 3. Build, Test, Lint, And Format

Typical jobs:

- run unit tests
- run integration or end-to-end tests
- run type checks
- lint and auto-fix
- format code
- build production artifacts

Typical tools:

- `vite build`
- `playwright test`
- `eslint`
- `prettier`
- `vitest`
- `jest`
- framework build scripts

Official examples:

- Playwright documents `npx playwright test`, headed mode, debug mode, UI mode, report viewing, codegen, trace viewing, and browser install from the CLI.
- Next.js now documents using the `eslint` CLI directly rather than relying on older framework-specific lint wrappers.

Why the terminal matters here:

- these are canonical repo commands
- exit codes and logs are machine-verifiable
- CI uses the same commands

### 4. Local Infrastructure And Containers

Typical jobs:

- bring up local databases and dependencies
- start multi-service stacks
- inspect logs
- exec into containers
- rebuild images
- compare local and CI environments

Typical tools:

- `docker`
- `docker compose`
- sometimes `kubectl`

Current prevalence signal from Stack Overflow 2025 professional developers:

- `Docker 73.8%`
- `Kubernetes 30.1%`

Official example:

- Docker documents `docker compose` as the command to define and run multi-container applications.

Why the terminal matters here:

- container workflows are fundamentally CLI-centric
- logs, exec, attach, and ad hoc inspection remain shell-native

### 5. Data And API Inspection

Typical jobs:

- hit APIs directly
- replay requests
- inspect auth headers and payloads
- query the local or staging database
- inspect cache state

Typical tools:

- `curl`
- `http` / HTTPie
- `psql`
- `redis-cli`

Current prevalence signal from Stack Overflow 2025 professional developers:

- `PostgreSQL 58.2%`
- `Redis 30.7%`

Why the terminal matters here:

- low-latency iteration
- precise control over requests and queries
- easy copy/paste into scripts and runbooks

### 6. Deploy, Operate, And Recover

Typical jobs:

- run release scripts
- inspect CI failures
- triage logs
- run infrastructure commands
- access remote systems
- manage pull requests and issues

Typical tools:

- `git`
- `gh`
- `ssh`
- `aws`
- `gcloud`
- `terraform`
- `ansible`
- host-specific CLIs such as `vercel`

Current prevalence signal from Stack Overflow 2025 professional developers:

- `AWS 45.9%`
- `Terraform 18.7%`
- `Ansible 11.2%`
- `Vercel 10.8%`
- `Cloudflare 19.7%`

Why the terminal matters here:

- production operations reward exact, scriptable steps
- GUI surfaces often lag behind CLI coverage
- shell access is still the emergency interface

## macOS Desktop Developers: What The Terminal Is Used For

There are two materially different macOS desktop developer profiles:

- native Apple developers using `Swift`, `SwiftUI`, `AppKit`, `Xcode`
- cross-platform desktop developers targeting macOS via `Electron`, `Tauri`, `Qt`, or adjacent stacks

Both use the terminal, but the native Apple stack adds several Apple-specific command-line workflows that do not exist on the pure web side.

### Survey Signals For Desktop Stacks

From Stack Overflow 2024, among professional developers in the desktop / non-web framework section:

- `Qt 6.5%`
- `Electron 6.3%`
- `SwiftUI 4.3%`
- `.NET MAUI 3.4%`
- `Tauri 2.1%`

This is not a full market-share picture, but it confirms that native and cross-platform desktop stacks both matter.

### 1. Native Build And Test Automation

Typical jobs:

- build a project or workspace outside the Xcode UI
- run tests
- archive builds
- integrate build/test into CI
- inspect result bundles

Typical tools:

- `xcodebuild`
- `swift build`
- `swift test`
- `xcresulttool`

Official Apple evidence:

- Apple’s Xcode command-line tool reference explicitly documents `xcodebuild`, `devicectl`, `simctl`, and related tools.
- Apple’s command-line tools overview says Terminal workflows cover open source or cross-platform projects, notarization, automated builds, continuous integration, and project settings.
- Swift.org documents `swift build` and `swift test` as standard SwiftPM flows.

Why the terminal matters here:

- reproducible CI-compatible automation
- build logs and result bundles are easier to inspect and script
- native workflows often need to be run outside the IDE

### 2. Simulator And Device Control

Typical jobs:

- boot and manage simulators
- install and launch apps
- inspect device state
- automate device and simulator workflows

Typical tools:

- `xcrun simctl`
- `xcrun devicectl`

Official Apple evidence:

- Apple lists `simctl` and `devicectl` in the Xcode command-line tool reference.

Why the terminal matters here:

- exact automation
- repeatability in CI and scripts
- easier integration with tests and build systems

### 3. Debugging And Profiling

Typical jobs:

- inspect process state
- set breakpoints
- step execution
- collect traces and profiling data
- inspect result artifacts

Typical tools:

- `lldb`
- `xctrace`
- `xcresulttool`

Official Apple evidence:

- Apple’s LLDB guide says LLDB provides the underlying debugging environment for Apple-platform developers and can be used from Terminal or an Xcode source editor.
- Apple lists `xctrace` and `xcresulttool` in the Xcode command-line reference.

Why the terminal matters here:

- some debugging and profiling flows are easier or only available in command-line form
- terminal debugging is still the lowest-level fallback when the IDE abstraction leaks

### 4. Signing, Notarization, And Release

Typical jobs:

- sign app bundles
- notarize releases
- staple notarization tickets
- verify Gatekeeper acceptance
- script distribution pipelines

Typical tools:

- `codesign`
- `notarytool`
- `stapler`
- `spctl`
- `xcode-select`

Official Apple evidence:

- Apple’s notarization docs state that since `November 1, 2023`, the notary service no longer accepts uploads from `altool` or Xcode 13 and earlier.
- Apple recommends `notarytool` and `stapler` for scripted notarization workflows.
- Apple notes that some commands such as `xcodebuild` and `xctrace` ship only with full Xcode, not just Command Line Tools.

Why the terminal matters here:

- release automation is inherently command-oriented
- cert, entitlements, notarization, and Gatekeeper issues are often easier to inspect from raw CLI output

### 5. Cross-Platform Desktop On macOS

For `Electron`, `Tauri`, and similar stacks, terminal usage looks like a hybrid:

- webapp tooling for the app itself
- Apple CLI tooling for the macOS release tail

Typical pattern:

- use `npm` / `pnpm`, bundlers, test runners, local servers, and browser tooling during app development
- then use Apple build/sign/notarization steps for distributable macOS artifacts

This is a major reason the terminal remains sticky on macOS even for teams that mostly think of themselves as GUI app developers.

## Which Console Programs Matter Most

### Strongly Evidenced, Mainstream

These are strongly backed by current surveys and official workflows:

- `bash` / shell
- `git`
- `docker`
- `docker compose`
- `npm`
- `pnpm`
- `yarn`
- `vite`
- `next`
- `eslint`
- `playwright`
- `psql`
- `redis-cli`
- `brew`
- `xcodebuild`
- `xcrun simctl`
- `xcrun devicectl`
- `lldb`
- `xcresulttool`
- `xctrace`
- `codesign`
- `notarytool`
- `stapler`
- `swift build`
- `swift test`

### Common In Terminal-Heavy Cohorts, But Poorly Measured In General Surveys

These are very common among serious shell users, but I do not have strong prevalence numbers from broad surveys:

- `tmux`
- `htop`
- `jq`
- `rg`
- `fd`
- `fzf`
- `bat`
- `make`

These should be treated as common and important, not as broadly quantified.

## Part II: Can AI Coding Agents Replace The Need To Personally Open A Terminal?

### Exact Answer

No. As of `2026-04-24`, AI coding agents do not sufficiently replace the need for serious webapp and macOS desktop developers to ever fire up a terminal session again.

They can replace a large share of manual command driving.

They do not yet remove the terminal as a necessary human fallback and precision-control surface.

### The Crucial Distinction

There are three different claims:

1. The developer does not manually type commands into Terminal.
2. The underlying CLI tools are no longer needed.
3. The developer never needs direct shell access.

Current agents can often satisfy `1`.

They do not satisfy `2`.

They do not reliably satisfy `3`.

This distinction matters because many seemingly "agent-native" workflows still depend on the exact same command-line substrate:

- `xcodebuild`
- `simctl`
- `devicectl`
- `lldb`
- `docker`
- `git`
- `psql`
- `npm`
- `notarytool`

The agent is an operator over those tools, not a replacement for them.

### Why The Answer Is Still No

### 1. "Ever" Is A Very High Bar

To say developers never need to open a terminal anymore, the agent must cover:

- routine workflows
- unusual workflows
- broken workflows
- exploratory workflows
- high-risk workflows
- recovery workflows

Current agents are decent to strong on the first category and still uneven on the rest.

### 2. Some Work Is Fundamentally Interactive And Exploratory

The terminal is not only a launcher. It is also:

- a REPL surface
- a debugging instrument
- a log and state viewer
- a TTY host for interactive tools
- an ad hoc composition environment for pipes, filters, and one-off probes

This is where current agents are weaker than a strong shell user.

### 3. Some Work Requires Immediate, Fine-Grained Control

Examples:

- follow a log stream and interrupt based on what you see
- bounce between `git`, `rg`, `jq`, and `curl` in seconds
- step through `lldb`
- inspect a failed notarization or signing edge case
- recover from environment breakage involving `PATH`, certs, Keychain, SSH, or Xcode selection

The human latency loop is still much better here.

### What AI Coding Agents Can Already Hide Well

These workflows are currently the strongest candidates for "you do not need to open Terminal yourself":

- build / test / lint / format loops
- routine codebase search and patching
- starting common dev servers
- replaying CI failures
- running browser test suites
- bringing up local containers
- scripted migrations
- standard Xcode build / test / simulator loops

Why these work:

- they have clear success signals
- they are scriptable
- they are easy to retry
- they produce machine-checkable outputs

For this class of work, using an agent inside an IDE, app, or browser is often sufficient.

### What Still Pulls Developers Back Into The Terminal

These workflows remain materially weaker:

- interactive debugging with `lldb`
- REPL-heavy exploration
- direct DB shell work
- TTY-only or TUI programs
- ad hoc shell pipelines
- environment and credential repair
- subtle signing / notarization / Gatekeeper failures
- long-running live diagnosis where the debugging plan changes every minute

For a strong terminal user, many of these are still faster by hand than by prompt, wait, inspect, re-prompt cycles.

### Product Evidence: Even "No-Terminal" Surfaces Still Depend On Terminal Semantics

### Codex

OpenAI’s current product story explicitly spans:

- CLI
- IDE extension
- Codex app
- cloud delegation

Official OpenAI docs say:

- Codex can pair with you in your terminal, IDE, or app.
- Codex can navigate a repo, edit files, run commands, and execute tests.
- The Codex app is designed so you can use multiple agents without terminal or IDE switching when that is convenient.
- The app shares session history and configuration with the Codex CLI and IDE extension.

Interpretation:

- Codex can hide the terminal for many workflows.
- It does not remove the command layer.
- OpenAI still treats CLI, IDE, app, and cloud as complementary surfaces, not replacements for one another.

### Claude Code

Anthropic’s docs are even more explicit about the continuing importance of the CLI:

- Claude Code is available in terminal, IDE, desktop app, and browser.
- The VS Code extension includes the CLI for advanced features.
- Anthropic states that some features are only available in the CLI.
- Anthropic also notes that background-process visibility is limited in the extension compared to the CLI.

Interpretation:

- GUI surfaces reduce direct shell use.
- They do not fully replace it.
- Anthropic itself documents fallback to the integrated terminal when you need full capability or visibility.

### OpenHands

OpenHands documents:

- a terminal CLI mode
- a web interface for the CLI

Its docs say the web interface runs the same terminal UI experience you see in the terminal, just in a browser.

Interpretation:

- this is not terminal elimination
- it is terminal remoting / proxying

### OpenClaw

OpenClaw’s exec tool explicitly supports:

- shell execution
- PTY mode
- TTY-only CLIs
- coding agents
- terminal UIs

Interpretation:

- OpenClaw is designed to operate terminal software, not replace the existence of terminal-native workflows.

### Xcode-Specific Analysis

Your example was effectively:

> instead of running `xcodebuild` or debugging myself, can I just throw it to Codex or Claude Code?

The accurate answer is:

- `xcodebuild test` loops: often yes
- simulator bring-up and repeated retry cycles: often yes
- `xcresulttool` inspection and basic failure triage: often yes
- full debugging ownership with complex runtime reasoning: only partially
- profiling and subtle performance diagnosis: weak to moderate
- signing and notarization edge cases: moderate at best, usually review-required
- enough to never personally open a terminal: no

This follows directly from Apple’s own tooling model:

- the build/test surface is `xcodebuild`
- device/simulator control is `simctl` and `devicectl`
- the underlying debugger is `lldb`
- scripted notarization uses `notarytool` and `stapler`

Those tools remain the authoritative substrate.

### Webapp-Specific Analysis

For webapp work, the "no personal terminal" story is stronger than on macOS native work, but still not complete.

### Where agent substitution is strongest

- `npm install`
- `pnpm dev`
- `vite build`
- `playwright test`
- `docker compose up`
- basic `curl` checks
- log scraping and fix loops

### Where it is still weak

- ad hoc `git` archaeology
- one-off shell pipelines
- exploratory database work
- SSH-heavy remote diagnosis
- production incident handling
- environment breakage

The stronger the workflow is at:

- being predefined
- being scriptable
- being easy to verify

the more likely the agent can hide the terminal successfully.

The stronger it is at:

- improvisation
- stateful inspection
- interactive interruption
- shell composition

the more likely the terminal remains the better direct interface.

### Benchmarks: Strong Capability, Not Full Sufficiency

Terminal-Bench 2.0 currently shows that terminal-task competence is real and materially improving.

As of `2026-04-23`:

- `Codex` with `GPT-5.5`: `82.0%`
- `Codex CLI` with `GPT-5.2`: `62.9%`
- `Claude Code` with `Claude Opus 4.6`: `58.0%`
- `OpenHands` with `Claude Opus 4.5`: `51.9%`

Interpretation:

- agents are now genuinely capable at terminal tasks
- scaffolding matters a lot
- benchmark success still does not imply that developers can retire terminal use in normal work

### Real-World Caveats

METR’s 2025 and 2026 work is useful here because it shows where benchmark optimism can break down.

### METR 2025 slowdown study

On `2025-07-10`, METR reported that experienced open-source developers working on their own repos took `19%` longer when using early-2025 AI tools in that study setting.

This does not prove agents are generally bad. It does show that real-world tool mediation can impose overhead even when the model is capable.

### METR 2025 holistic-evaluation study

On `2025-08-13`, METR reported that agents often produced code that passed algorithmic checks but still was not mergeable as-is because of testing, formatting, documentation, or code-quality issues.

Interpretation for terminal replacement:

- passing commands and tests is not the same as finishing the workflow
- a human still needs trustworthy inspection surfaces
- the terminal often remains one of those surfaces

### METR 2026 update

On `2026-02-24`, METR said newer tools likely help more than the early-2025 systems did, but their newer experiment could not cleanly quantify current uplift because of participation bias.

Interpretation:

- capability is moving quickly
- the direction is clearly upward
- the evidence still does not support "terminal no longer needed"

### Practical Replacement Matrix

| Workflow | Can an agent often hide manual terminal use today? | Do underlying CLI tools still matter? | Is direct human terminal use still meaningfully needed sometimes? | Notes |
| --- | --- | --- | --- | --- |
| Install dependencies / bootstrap | Yes | Yes | Sometimes | Strong fit for agents |
| Start dev server / watchers | Yes | Yes | Sometimes | Mostly routine |
| Build / lint / unit test loops | Yes | Yes | Sometimes | Strong fit for agents |
| Browser E2E test runs | Yes | Yes | Sometimes | Good when outputs are clear |
| Docker / Compose bring-up | Often | Yes | Yes | Logs and exec still pull humans back in |
| Basic DB / API checks | Often | Yes | Yes | Exploratory work remains better by hand |
| Git chores and PR prep | Often | Yes | Yes | Ad hoc history work still shell-friendly |
| Xcode build / test / simulator loops | Often | Yes | Yes | Stronger than many people expect |
| LLDB debugging | Partially | Yes | Yes | Still not a solved no-terminal workflow |
| Profiling / xctrace / perf diagnosis | Partially | Yes | Yes | Interpretation-heavy |
| Signing / notarization / Gatekeeper work | Partially | Yes | Yes | Needs review and recovery skills |
| Production incident response | Partially | Yes | Yes | High-variance, high-context |
| Environment repair | Weakly | Yes | Yes | One of the strongest reasons terminals remain necessary |
| Shell-native exploratory pipelines | Weakly | Yes | Yes | This is where serious shell users remain faster |

## Final Conclusion

The modern terminal is still the universal orchestration and recovery layer for both webapp and macOS desktop development.

AI coding agents already reduce the amount of time a developer must personally spend typing commands. They are now good enough to hide the terminal for many routine workflows.

But they are not yet sufficient to make serious developers stop opening terminal sessions altogether.

The main reason is not that agents cannot run commands. They clearly can.

The main reason is that development work still contains too much:

- interactive inspection
- changing hypotheses
- environment breakage
- TTY-native tooling
- low-latency exploratory shell work
- release and incident edge cases

Those are exactly the situations where the terminal is not just a launcher but a high-bandwidth thinking and control surface.

## Sources

- Stack Overflow Developer Survey 2025 overview: https://survey.stackoverflow.co/2025/
- Stack Overflow Developer Survey 2025 technology: https://survey.stackoverflow.co/2025/technology
- Stack Overflow Developer Survey 2024 technology: https://survey.stackoverflow.co/2024/technology
- JetBrains Developer Ecosystem 2024: https://www.jetbrains.com/lp/devecosystem-2024/
- OpenAI Codex CLI getting started: https://help.openai.com/en/articles/11096431-openai-codex-ligetting-started
- OpenAI Codex in ChatGPT: https://help.openai.com/en/articles/11369540-codex-in-chatgpt
- OpenAI Introducing Codex: https://openai.com/index/introducing-codex/
- OpenAI Introducing the Codex app: https://openai.com/index/introducing-the-codex-app/
- Anthropic Claude Code overview: https://code.claude.com/docs/en/overview
- Anthropic Claude Code VS Code integration: https://code.claude.com/docs/en/ide-integrations
- OpenHands terminal CLI mode: https://docs.openhands.dev/openhands/usage/cli/terminal
- OpenHands web interface: https://docs.openhands.dev/openhands/usage/cli/web-interface
- OpenClaw exec tool: https://docs.openclaw.ai/tools/exec
- Apple command-line tools overview: https://developer.apple.com/documentation/xcode/command-line-tools
- Apple installing command-line tools: https://developer.apple.com/documentation/xcode/installing-the-command-line-tools/
- Apple Xcode command-line tool reference: https://developer.apple.com/documentation/xcode/xcode-command-line-tool-reference
- Apple notarization overview: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- Apple notarization customization: https://developer.apple.com/documentation/security/customizing-the-notarization-workflow
- Apple LLDB guide: https://developer.apple.com/library/archive/documentation/General/Conceptual/lldb-guide/chapters/Introduction.html
- Vite guide: https://vite.dev/guide/
- Vite CLI: https://vite.dev/guide/cli
- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Playwright CLI: https://playwright.dev/docs/test-cli
- Docker Compose CLI: https://docs.docker.com/reference/cli/docker/compose/
- Swift getting started: https://www.swift.org/getting-started/
- SwiftPM CLI guide: https://www.swift.org/getting-started/cli-swiftpm
- Swift build guidance: https://www.swift.org/documentation/server/guides/building.html
- Swift testing guidance: https://www.swift.org/documentation/server/guides/testing.html
- Git command-line guidance: https://git-scm.com/book/ms/v2/Getting-Started-The-Command-Line.html
- Git everyday commands: https://git-scm.com/docs/everyday.html
- Terminal-Bench 2.0 leaderboard: https://www.tbench.ai/leaderboard/terminal-bench/2.0
- METR slowdown study: https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
- METR algorithmic vs holistic evaluation: https://metr.org/blog/2025-08-12-research-update-towards-reconciling-slowdown-with-time-horizons/
- METR 2026 productivity-experiment update: https://metr.org/blog/2026-02-24-uplift-update/
