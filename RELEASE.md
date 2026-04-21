# Release v0.1.0

Initial public release of SGO (`Shit Get Out`).

## Included

- Claude Code adapter under `.claude/sgo/`
- Codex adapter under `.codex/sgo/`
- Codex skills under `.codex/skills/sgo-*`
- Codex agents under `.codex/agents/sgo-*.toml`
- Unified installer: `scripts/bootstrap.sh`
- Runtime-specific installers:
  - `scripts/install-claude.sh`
  - `scripts/install-codex.sh`
- Codex adapter generator:
  - `scripts/generate-codex-sgo.py`

## Positioning

SGO is a writing workflow framework for AI agents.

It explicitly references the code-workflow project `Get Shit Done`, but applies the same discipline to story generation, constitution locking, outline validation, draft production, and final manuscript output.

## Public Repo Hygiene

This release intentionally excludes:

- local `.sgo/` project state
- `.planning/` process artifacts
- local-only Claude settings
- unrelated Codex skills and local media assets

## Recommended Install

```bash
bash scripts/bootstrap.sh
```
