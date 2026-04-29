---
name: "sgo-discuss"
description: "SGO Codex command adapter for `$sgo-discuss`. Use when the user invokes `$sgo-discuss` or asks to discuss the writing direction before executing the next SGO phase."
metadata:
  short-description: "Run SGO discuss workflow in Codex"
---

<codex_skill_adapter>
## Invocation
- Invoke this skill as `$sgo-discuss` followed by optional arguments.
- Treat all user text after `$sgo-discuss` as `{{SGO_ARGS}}`.
- Codex uses `$sgo-*` skills instead of Claude `/sgo-*` slash commands.

## Claude-to-Codex Mapping
- `Agent` / subagent calls -> `spawn_agent(agent_type="sgo-...")`.
- Confirmation prompts -> `request_user_input` when available; otherwise ask concise plain text.
- Paths under `.claude/sgo/` -> `.codex/sgo/`.
- Project writing data remains under `.sgo/`.

## Required Context
Read `.codex/sgo/commands/sgo-discuss.md` and execute that workflow using Codex tools.
</codex_skill_adapter>

<arguments>
{{SGO_ARGS}}
</arguments>
