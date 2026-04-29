---
name: "sgo-review"
description: "SGO Codex command adapter for `$sgo-review`. Use when the user invokes `$sgo-review`, asks for final review, or uses `$sgo-review fix ...` to route review findings into the repair workflow."
metadata:
  short-description: "Run SGO review workflow in Codex"
---

<codex_skill_adapter>
## Invocation
- Invoke this skill as `$sgo-review` followed by optional arguments.
- Treat all user text after `$sgo-review` as `{{SGO_ARGS}}`.
- Codex uses `$sgo-*` skills instead of Claude `/sgo-*` slash commands.
- If `{{SGO_ARGS}}` starts with `fix`, `修复`, or `revise`, route directly into the `sgo-fix` workflow instead of running the review flow locally.

## Claude-to-Codex Mapping
- `Agent` / subagent calls -> `spawn_agent(agent_type="sgo-...")`.
- Review/finalization must use `spawn_agent(agent_type="sgo-finalizer")` when available; only fall back to local execution if subagents are unavailable in the current environment.
- Confirmation prompts -> `request_user_input` when available; otherwise ask concise plain text.
- Paths under `.claude/sgo/` -> `.codex/sgo/`.
- Project writing data remains under `.sgo/`.

## Required Context
Read `.codex/sgo/commands/sgo-review.md` and execute that workflow using Codex tools.
</codex_skill_adapter>

<arguments>
{{SGO_ARGS}}
</arguments>
