---
name: "sgo-continue"
description: "SGO Codex command adapter for `$sgo-continue`. Use when the user invokes `$sgo-continue` or asks to run the corresponding SGO writing workflow."
metadata:
  short-description: "Run SGO continue workflow in Codex"
---

<codex_skill_adapter>
## Invocation
- Invoke this skill as `$sgo-continue` followed by optional arguments.
- Treat all user text after `$sgo-continue` as `{{SGO_ARGS}}`.
- Codex uses `$sgo-*` skills instead of Claude `/sgo-*` slash commands.

## Claude-to-Codex Mapping
- `Agent` / subagent calls -> `spawn_agent(agent_type="sgo-...")`.
- Confirmation prompts -> `request_user_input` when available; otherwise ask concise plain text.
- Paths under `.claude/sgo/` -> `.codex/sgo/`.
- Project writing data remains under `.sgo/`.

## Required Context
Read `.codex/sgo/commands/sgo-continue.md` and execute that workflow using Codex tools.
</codex_skill_adapter>

<arguments>
{{SGO_ARGS}}
</arguments>
