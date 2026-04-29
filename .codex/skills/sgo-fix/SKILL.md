---
name: "sgo-fix"
description: "SGO Codex command adapter for `$sgo-fix`. Use when the user wants to fix issues found by `$sgo-review`, revise chapters against a review report, or run a review-to-rewrite repair loop."
metadata:
  short-description: "Run SGO fix workflow in Codex"
---

<codex_skill_adapter>
## Invocation
- Invoke this skill as `$sgo-fix` followed by optional arguments.
- Treat all user text after `$sgo-fix` as `{{SGO_ARGS}}`.
- Codex uses `$sgo-*` skills instead of Claude `/sgo-*` slash commands.

## Claude-to-Codex Mapping
- `Agent` / subagent calls -> `spawn_agent(agent_type="sgo-...")` when available; otherwise execute the equivalent workflow directly.
- Revision work should default to existing agents:
  - prose/chapter repair -> `spawn_agent(agent_type="sgo-writer")` in revision mode
  - non-prose artifact sync -> main agent locally or a generic worker if needed
- Do not assume a platform-level `sgo-fixer` agent type exists.
- Confirmation prompts -> `request_user_input` when available; otherwise ask concise plain text.
- Paths under `.claude/sgo/` -> `.codex/sgo/`.
- Project writing data remains under `.sgo/`.

## Required Context
Read `.codex/sgo/commands/sgo-fix.md` and execute that workflow using Codex tools.
</codex_skill_adapter>

<arguments>
{{SGO_ARGS}}
</arguments>
