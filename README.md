# Shit Get Out

SGO is a structured writing workflow for AI agents.

It turns a vague story idea into a finished manuscript through a staged pipeline, shared project state, and runtime adapters for both Claude Code and Codex.

This project explicitly references `Get Shit Done` as a code-workflow inspiration. SGO applies that same workflow discipline to fiction and long-form writing instead of generic software delivery.

## Why

Most AI writing sessions drift.

SGO forces the process into explicit artifacts and checkpoints:

- `research`
- `design`
- `constitution`
- `outline`
- `validation`
- `writing`
- `finalize`

The output of each stage is stored in `.sgo/`, so the project can resume cleanly across sessions and across runtimes.

## Runtimes

- Claude Code: `/sgo-*`
- Codex: `$sgo-*`

Both runtimes share the same `.sgo/` project data model.

## Install

Install both adapters into the current project:

```bash
bash scripts/bootstrap.sh
```

Install only one runtime:

```bash
bash scripts/bootstrap.sh --runtime claude
bash scripts/bootstrap.sh --runtime codex
```

Preview changes first:

```bash
bash scripts/bootstrap.sh --dry-run
```

Remove installed adapters:

```bash
bash scripts/bootstrap.sh --uninstall
```

## What Gets Installed

Claude side:

- `.claude/sgo/`
- `/sgo-*` command entrypoints
- hook wiring in `.claude/settings.json`

Codex side:

- `.codex/sgo/`
- `.codex/skills/sgo-*`
- `.codex/agents/sgo-*.toml`
- repo-local `.codex/hooks.json`
- `$CODEX_HOME` skill and agent registration

## Workflow Model

SGO writes and reads these shared artifacts:

- `.sgo/research/`
- `.sgo/constitution/`
- `.sgo/outline/`
- `.sgo/drafts/`
- `.sgo/chapters/`
- `.sgo/validation/`
- `.sgo/tracking/`
- `.sgo/output/`
- `.sgo/STATE.md`

That means you can start in Claude, continue in Codex, and keep the same project state.

## Codex Notes

Codex hooks are not identical to Claude hooks.

In practice, the Codex adapter is designed as:

- shared artifact model in `.sgo/`
- repo-local hook guardrails where Codex supports them
- explicit workflow logic in skills and agents

The installer enables:

```toml
[features]
codex_hooks = true
```

## Repository Layout

- `.claude/sgo/`
  Claude-oriented source workflow
- `.codex/sgo/`
  Codex-oriented generated adapter
- `.codex/skills/sgo-*`
  Codex skill entrypoints
- `.codex/agents/sgo-*.toml`
  Codex agent definitions
- `scripts/`
  installers and generator

## Development

The Claude adapter is the source of truth.

After changing `.claude/sgo/`, regenerate the Codex adapter:

```bash
python3 scripts/generate-codex-sgo.py
```

Basic validation:

```bash
python3 -m py_compile scripts/generate-codex-sgo.py
bash -n scripts/bootstrap.sh scripts/install-claude.sh scripts/install-codex.sh
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).

## 中文简介

SGO 全称是 `Shit Get Out`。

它明确参考了代码工作流 `Get Shit Done`，但目标不是代码交付，而是把小说与长文本创作拆成可执行、可恢复、可追踪的多阶段流程，并同时支持 Claude Code 与 Codex。
