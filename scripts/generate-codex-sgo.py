#!/usr/bin/env python3
"""Generate the Codex adapter layer for SGO from the Claude source tree."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLAUDE_SGO = ROOT / ".claude" / "sgo"
CODEX = ROOT / ".codex"
CODEX_SGO = CODEX / "sgo"
CODEX_SKILLS = CODEX / "skills"
CODEX_AGENTS = CODEX / "agents"


COMMANDS = [
    "sgo-init",
    "sgo-start",
    "sgo-status",
    "sgo-write",
    "sgo-validate",
    "sgo-review",
    "sgo-export",
    "sgo-continue",
    "sgo-doctor",
]


AGENT_MODEL_MAP = {
    "opus": "Use gpt-5.4 with high reasoning for final-quality literary judgment.",
    "sonnet": "Use gpt-5.4 with medium reasoning for balanced workflow execution.",
    "haiku": "Use gpt-5.4 with low reasoning for fast scans and summaries.",
    "inherit": "Use the current session model and reasoning effort unless the orchestrator specifies otherwise.",
}


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def parse_frontmatter(content: str) -> tuple[dict[str, str], str]:
    if not content.startswith("---\n"):
        return {}, content
    end = content.find("\n---", 4)
    if end == -1:
        return {}, content
    raw = content[4:end].strip().splitlines()
    meta: dict[str, str] = {}
    current_key: str | None = None
    for line in raw:
        if not line.strip():
            continue
        if re.match(r"^[A-Za-z_-]+:", line):
            key, value = line.split(":", 1)
            current_key = key.strip()
            value = value.strip()
            if value in {">", "|"}:
                meta[current_key] = ""
            else:
                meta[current_key] = value.strip('"')
        elif current_key:
            meta[current_key] += "\n" + line.strip()
    return meta, content[end + 4 :].lstrip()


def adapt_text_for_codex(text: str) -> str:
    replacements = {
        ".claude/sgo/": ".codex/sgo/",
        ".claude/sgo": ".codex/sgo",
        ".claude/agents/": ".codex/agents/",
        ".claude/commands/": ".codex/skills/",
        ".claude/skills/": ".codex/skills/",
        "/sgo-": "$sgo-",
        "Claude Code": "Codex",
        "Claude": "Codex",
        "Agent prompt": "Codex subagent prompt",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = text.replace("'.claude', 'sgo'", "'.codex', 'sgo'")
    text = text.replace('".claude", "sgo"', '".codex", "sgo"')
    return text


def reset_generated_dirs() -> None:
    if CODEX_SGO.exists():
        shutil.rmtree(CODEX_SGO)
    for command in COMMANDS:
        path = CODEX_SKILLS / command
        if path.exists():
            shutil.rmtree(path)
    if CODEX_AGENTS.exists():
        for path in CODEX_AGENTS.glob("sgo-*.toml"):
            path.unlink()
    CODEX_SGO.mkdir(parents=True, exist_ok=True)
    CODEX_AGENTS.mkdir(parents=True, exist_ok=True)


def copy_static_sgo_tree() -> None:
    for rel in ["config", "templates", "scripts"]:
        src = CLAUDE_SGO / rel
        dst = CODEX_SGO / rel
        if src.exists():
            copy_tree_adapted(src, dst)


def copy_tree_adapted(src: Path, dst: Path) -> None:
    for item in src.rglob("*"):
        relative = item.relative_to(src)
        target = dst / relative
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            content = item.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            shutil.copy2(item, target)
            continue
        write_text(target, adapt_text_for_codex(content))


def generate_codex_hooks() -> None:
    hooks_dir = CODEX_SGO / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted((CLAUDE_SGO / "hooks").glob("*.js")):
        if src.name.endswith(".test.js"):
            continue
        content = adapt_text_for_codex(read_text(src))
        content = content.replace("process.env.CLAUDE_PROJECT_DIR", "process.env.CODEX_PROJECT_DIR")
        write_text(hooks_dir / src.name, content)

    adapter = """#!/usr/bin/env node
// SGO Codex hook adapter
// Bridges Codex hook JSON shape to the existing SGO hook scripts.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const hookName = process.argv[2];
if (!hookName) process.exit(0);

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const payload = input ? JSON.parse(input) : {};
    const cwd = payload.cwd || process.cwd();
    const projectRoot = findProjectRoot(cwd);
    const event = payload.hook_event_name || '';
    const command = payload.tool_input?.command || '';
    const adapted = { ...payload, cwd: projectRoot, hook_event_name: event };

    // Codex currently exposes Bash for tool hooks. SGO hooks were written for
    // a richer tool event surface, so we provide best-effort path extraction.
    adapted.tool_name = inferToolName(event, command);
    adapted.tool_input = {
      ...(payload.tool_input || {}),
      file_path: inferFilePath(command),
      path: inferFilePath(command),
    };

    const hookPath = path.join(projectRoot, '.codex', 'sgo', 'hooks', `${hookName}.js`);
    if (!fs.existsSync(hookPath)) process.exit(0);

    const result = spawnSync('node', [hookPath], {
      input: JSON.stringify(adapted),
      encoding: 'utf8',
      cwd: projectRoot,
      timeout: 30000,
    });

    if (result.stdout) {
      process.stdout.write(normalizeOutput(event, result.stdout));
    }
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status || 0);
  } catch {
    process.exit(0);
  }
});

function findProjectRoot(start) {
  let current = path.resolve(start || process.cwd());
  while (true) {
    if (fs.existsSync(path.join(current, '.codex', 'sgo'))) return current;
    if (fs.existsSync(path.join(current, '.sgo'))) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(start || process.cwd());
    current = parent;
  }
}

function inferToolName(event, command) {
  if (!command) return 'Bash';
  if (/\\b(cat|sed|rg|grep|find|ls|pwd)\\b/.test(command)) return 'Read';
  if (/>|tee\\s+|apply_patch|python3?\\s+-/.test(command)) return event === 'PostToolUse' ? 'Write' : 'Bash';
  return 'Bash';
}

function inferFilePath(command) {
  if (!command) return '';
  const patterns = [
    /(?:^|\\s)(?:cat|sed|tee)\\s+[^>]*?((?:\\.\\/)?\\.sgo\\/[^\\s'"]+)/,
    />\\s*((?:\\.\\/)?\\.sgo\\/[^\\s'"]+)/,
    /((?:\\.\\/)?\\.sgo\\/(?:drafts|chapters|outline|constitution|validation|tracking)\\/[^\\s'"]+)/,
  ];
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) return match[1].replace(/^\\.\\//, '');
  }
  return '';
}

function normalizeOutput(event, stdout) {
  try {
    const data = JSON.parse(stdout);
    if (event === 'SessionStart' && data.hookSpecificOutput?.additionalContext) {
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: data.hookSpecificOutput.additionalContext,
        },
      });
    }
    if (event === 'PreToolUse' && (data.decision === 'block' || data.decision === 'deny')) {
      return JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: data.reason || 'Blocked by SGO hook.',
        },
      });
    }
    if (event === 'PostToolUse' && (data.decision === 'block' || data.decision === 'deny')) {
      return JSON.stringify({
        continue: false,
        stopReason: data.reason || 'Blocked by SGO hook.',
        systemMessage: data.reason || 'Blocked by SGO hook.',
      });
    }
    if (event === 'PostToolUse') {
      const context = data.hookSpecificOutput?.additionalContext || data.reason;
      return context ? JSON.stringify({ systemMessage: context }) : '';
    }
    if (event === 'PreToolUse') return '';
    return stdout;
  } catch {
    return stdout;
  }
}
"""
    write_text(hooks_dir / "codex-hook-adapter.js", adapter)

    hook_command = (
        'ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"; '
        'node "$ROOT/.codex/sgo/hooks/codex-hook-adapter.js"'
    )
    entry_hooks = [
        ("research-entry", "SGO research gate"),
        ("design-entry", "SGO design gate"),
        ("constitution-entry", "SGO constitution gate"),
        ("outline-entry", "SGO outline gate"),
        ("validation-entry", "SGO validation gate"),
        ("writing-entry", "SGO writing gate"),
        ("finalize-entry", "SGO finalize gate"),
    ]
    exit_hooks = [
        ("research-exit", "SGO research review"),
        ("design-exit", "SGO design review"),
        ("constitution-exit", "SGO constitution review"),
        ("outline-exit", "SGO outline review"),
        ("validation-exit", "SGO validation review"),
        ("writing-exit", "SGO writing review"),
        ("finalize-exit", "SGO finalize review"),
    ]
    hooks_json = {
        "hooks": {
            "SessionStart": [
                {
                    "matcher": "startup|resume",
                    "hooks": [
                        {
                            "type": "command",
                            "command": f"{hook_command} session-start",
                            "statusMessage": "SGO loading writing session",
                        }
                    ],
                }
            ],
            "PreToolUse": [
                {
                    "matcher": "Bash",
                    "hooks": [
                        {
                            "type": "command",
                            "command": f"{hook_command} {hook_name}",
                            "statusMessage": status,
                        }
                        for hook_name, status in entry_hooks
                    ],
                }
            ],
            "PostToolUse": [
                {
                    "matcher": "Bash",
                    "hooks": [
                        {
                            "type": "command",
                            "command": f"{hook_command} {hook_name}",
                            "statusMessage": status,
                        }
                        for hook_name, status in exit_hooks
                    ],
                }
            ],
        }
    }
    write_text(CODEX / "hooks.json", json.dumps(hooks_json, ensure_ascii=False, indent=2) + "\n")


def toml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def generate_agents() -> None:
    for src in sorted((CLAUDE_SGO / "agents").glob("sgo-*.md")):
        meta, body = parse_frontmatter(read_text(src))
        name = meta.get("name", src.stem)
        description = re.sub(r"\s+", " ", meta.get("description", "")).strip()
        model = (meta.get("model", "inherit").split("#", 1)[0].strip() or "inherit").lower()
        instruction = adapt_text_for_codex(body)
        model_note = AGENT_MODEL_MAP.get(model, AGENT_MODEL_MAP["inherit"])
        developer_instructions = f"""<role>
{instruction.strip()}
</role>

<codex_adapter>
- This is the Codex adapter for the SGO agent `{name}`.
- {model_note}
- Use `.codex/sgo/config` and `.codex/sgo/templates` for framework references.
- Read `.sgo/STATE.md` before changing SGO project artifacts.
- Preserve `.sgo/` as the shared project data directory for both Claude and Codex.
</codex_adapter>
"""
        content = (
            f"name = {toml_string(name)}\n"
            f"description = {toml_string(description)}\n"
            'sandbox_mode = "workspace-write"\n'
            f"developer_instructions = {toml_string(developer_instructions)}\n"
        )
        write_text(CODEX_AGENTS / f"{name}.toml", content)


def generate_command_references() -> None:
    commands_dir = CODEX_SGO / "commands"
    commands_dir.mkdir(parents=True, exist_ok=True)
    for src in sorted((CLAUDE_SGO / "commands").glob("sgo-*.md")):
        body = adapt_text_for_codex(read_text(src))
        body = body.replace("读取 `.claude/settings.json`", "读取 `.codex/hooks.json`")
        body = body.replace("node .claude/sgo/scripts/methodology-profile.js", "node .codex/sgo/scripts/methodology-profile.js")
        adapter_note = """\n\n## Codex Adapter Notes\n\n- Treat `$ARGUMENTS` / `$1` as the text after the `$sgo-*` skill invocation.\n- When this workflow says to spawn an SGO Agent, use Codex `spawn_agent(agent_type=\"sgo-...\")` if subagents are explicitly available in the current environment; otherwise execute the same agent instructions directly.\n- Keep all writing artifacts in `.sgo/`; `.codex/sgo/` only stores reusable framework files.\n"""
        write_text(commands_dir / src.name, body.rstrip() + adapter_note)


def generate_skills() -> None:
    for command in COMMANDS:
        cmd_ref = f".codex/sgo/commands/{command}.md"
        command_title = command.replace("sgo-", "")
        description = (
            f"SGO Codex command adapter for `${command}`. Use when the user invokes "
            f"`${command}` or asks to run the corresponding SGO writing workflow."
        )
        arg_placeholder = "{{SGO_ARGS}}"
        content = f"""---
name: {json.dumps(command, ensure_ascii=False)}
description: {json.dumps(description, ensure_ascii=False)}
metadata:
  short-description: {json.dumps(f"Run SGO {command_title} workflow in Codex", ensure_ascii=False)}
---

<codex_skill_adapter>
## Invocation
- Invoke this skill as `${command}` followed by optional arguments.
- Treat all user text after `${command}` as `{arg_placeholder}`.
- Codex uses `$sgo-*` skills instead of Claude `/sgo-*` slash commands.

## Claude-to-Codex Mapping
- `Agent` / subagent calls -> `spawn_agent(agent_type=\"sgo-...\")`.
- Confirmation prompts -> `request_user_input` when available; otherwise ask concise plain text.
- Paths under `.claude/sgo/` -> `.codex/sgo/`.
- Project writing data remains under `.sgo/`.

## Required Context
Read `{cmd_ref}` and execute that workflow using Codex tools.
</codex_skill_adapter>

<arguments>
{arg_placeholder}
</arguments>
"""
        write_text(CODEX_SKILLS / command / "SKILL.md", content)


def main() -> None:
    if not CLAUDE_SGO.exists():
        raise SystemExit("Missing .claude/sgo source tree")
    reset_generated_dirs()
    copy_static_sgo_tree()
    generate_command_references()
    generate_codex_hooks()
    generate_agents()
    generate_skills()


if __name__ == "__main__":
    main()
