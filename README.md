# Shit Get Out

SGO stands for `Shit Get Out`.

This project explicitly references and adapts ideas from the coding workflow project `Get Shit Done`. In particular, the command-oriented orchestration, agent decomposition mindset, and workflow discipline were influenced by that code-workflow lineage. SGO applies those ideas to structured fiction and long-form writing.

It is a novel-writing workflow for AI coding agents, built around one shared project data model in `.sgo/` and two runtime adapters:

- Claude Code: `/sgo-*` commands
- Codex: `$sgo-*` skills

The goal is simple: turn a vague story idea into a finished manuscript with a repeatable pipeline, explicit artifacts, and guardrails that stop the workflow from drifting.

## Workflow

SGO organizes long-form writing into seven phases:

1. `research`
   Gather domain knowledge, genre conventions, reference works, and concrete writing material.
2. `design`
   Define style anchors, tone, and voice when the project needs a dedicated style pass.
3. `constitution`
   Lock the non-negotiable rules of the project: iron rules, guidelines, prohibitions.
4. `outline`
   Build the executable structure: acts, chapters/scenes, foreshadowing, character arcs, emotional beats.
5. `validation`
   Check the outline against the constitution before writing starts.
6. `writing`
   Draft chapters/scenes while preserving style, continuity, and structural intent.
7. `finalize`
   Audit the manuscript, resolve blockers, and export deliverables.

The framework persists progress in `.sgo/STATE.md` and stores phase artifacts in:

- `.sgo/research/`
- `.sgo/constitution/`
- `.sgo/outline/`
- `.sgo/drafts/`
- `.sgo/chapters/`
- `.sgo/validation/`
- `.sgo/tracking/`
- `.sgo/output/`

Claude and Codex share this same `.sgo/` directory. You can switch runtimes without losing project state.

## 中文说明

SGO 全称是 `Shit Get Out`。

这个项目明确参考了代码工作流 `Get Shit Done` 的方法论，包括：

- 命令式工作流分解
- Agent 角色拆分
- 状态驱动的多阶段执行
- 用统一项目目录承载全过程产物

不同的是，SGO 把这套方法从“代码交付”转成了“小说与长文本创作交付”。

## Repository Layout

Framework source lives in two adapters:

- `.claude/sgo/`
  Claude-oriented commands, agents, hooks, templates, and config.
- `.codex/sgo/`
  Codex-oriented adapter files generated from the Claude source tree.

Codex also uses:

- `.codex/skills/sgo-*`
  Skill entrypoints for `$sgo-init`, `$sgo-start`, `$sgo-write`, and the rest.
- `.codex/agents/sgo-*.toml`
  Codex subagent definitions for the SGO roles.

## Quick Start

Install both adapters into the current project:

```bash
bash scripts/bootstrap.sh
```

Install only one runtime:

```bash
bash scripts/bootstrap.sh --runtime claude
bash scripts/bootstrap.sh --runtime codex
```

Preview what will happen:

```bash
bash scripts/bootstrap.sh --dry-run
```

Remove installed adapters:

```bash
bash scripts/bootstrap.sh --uninstall
```

## Installation

### Claude Code

Install into the current project:

```bash
bash scripts/install-claude.sh
```

Useful options:

```bash
bash scripts/install-claude.sh --brand "My Studio" --shell zsh
bash scripts/install-claude.sh --dry-run
bash scripts/install-claude.sh --uninstall
```

This installer:

- copies `.claude/sgo/` into the target project when needed
- creates `.claude/commands/sgo-*.md` symlinks
- creates `.claude/agents/sgo-*.md` symlinks
- merges SGO hooks into `.claude/settings.json`
- keeps `.sgo/` project data untouched on uninstall

After install, use:

- `/sgo-init`
- `/sgo-start`
- `/sgo-status`
- `/sgo-write`
- `/sgo-validate`
- `/sgo-review`
- `/sgo-export`
- `/sgo-continue`
- `/sgo-doctor`

### Codex

Generate and install the Codex adapter:

```bash
bash scripts/install-codex.sh
```

Useful options:

```bash
bash scripts/install-codex.sh --brand "My Studio" --shell bash
bash scripts/install-codex.sh --codex-home /path/to/.codex --dry-run
bash scripts/install-codex.sh --uninstall
```

This installer:

- generates `.codex/sgo/` from `.claude/sgo/`
- installs repo-local `.codex/hooks.json`
- copies `sgo-*` skills into `$CODEX_HOME/skills`
- copies `sgo-*` agents into `$CODEX_HOME/agents`
- patches `$CODEX_HOME/config.toml` with an `# >>> SGO managed block`
- enables `[features] codex_hooks = true`
- keeps `.sgo/` project data untouched on uninstall

After install, use:

- `$sgo-init`
- `$sgo-start`
- `$sgo-status`
- `$sgo-write`
- `$sgo-validate`
- `$sgo-review`
- `$sgo-export`
- `$sgo-continue`
- `$sgo-doctor`

## Hooks: Claude vs Codex

The two runtimes do not expose the same hook surface.

Claude Code:

- has a richer hook and tool event model
- can enforce more of the workflow directly

Codex:

- currently requires `[features] codex_hooks = true`
- reads hooks from repo-local and home-level `.codex/hooks.json`
- is strongest on `SessionStart`, `PreToolUse`, `PostToolUse`, and `Stop`
- currently treats hooks mainly as Bash-oriented guardrails, not complete enforcement

That means the Codex port is intentionally pragmatic:

- keep the shared `.sgo/` artifact model
- preserve stage guardrails where Codex hooks can help
- move the rest of the discipline into skills, agents, and explicit workflow instructions

## Brand And Terminal Options

Both installers support:

- `--brand`
  Display branding only. It does not rename `.sgo/`, `sgo-*`, or internal files.
- `--shell` or `--terminal`
  Records the preferred terminal family: `auto`, `bash`, `zsh`, `fish`, `pwsh`

The framework command names stay stable on purpose:

- Claude: `/sgo-*`
- Codex: `$sgo-*`

Stable command names keep docs, hooks, skills, and shared project state predictable.

## Publishing

For a distributable checkout, these files are the release-critical surface:

- [README.md](/home/zhangyangrui/my_programes/writing_frame/README.md)
- [scripts/bootstrap.sh](/home/zhangyangrui/my_programes/writing_frame/scripts/bootstrap.sh)
- [scripts/install-claude.sh](/home/zhangyangrui/my_programes/writing_frame/scripts/install-claude.sh)
- [scripts/install-codex.sh](/home/zhangyangrui/my_programes/writing_frame/scripts/install-codex.sh)
- [scripts/generate-codex-sgo.py](/home/zhangyangrui/my_programes/writing_frame/scripts/generate-codex-sgo.py)
- `.claude/sgo/`

Recommended release flow:

1. Commit the Claude source tree and installer scripts.
2. Commit the generated Codex adapter files if you want zero-step Codex consumption from source checkouts.
3. Tag a version.
4. Tell users to run `bash scripts/bootstrap.sh`.

## Release Notes

Initial public release scope:

- Claude adapter with `/sgo-*` commands
- Codex adapter with `$sgo-*` skills
- Shared `.sgo/` writing artifact model
- Codex generator and installer scripts
- Unified bootstrap installer for `claude`, `codex`, or `both`

## Development

If you update the Claude source tree and want to refresh the Codex adapter:

```bash
python3 scripts/generate-codex-sgo.py
```

That script regenerates only SGO-related Codex files:

- `.codex/sgo/`
- `.codex/skills/sgo-*`
- `.codex/agents/sgo-*.toml`
- `.codex/hooks.json`

It does not remove unrelated Codex skills already present in `.codex/`.
