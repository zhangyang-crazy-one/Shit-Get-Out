#!/usr/bin/env node
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
  if (/\b(cat|sed|rg|grep|find|ls|pwd)\b/.test(command)) return 'Read';
  if (/>|tee\s+|apply_patch|python3?\s+-/.test(command)) return event === 'PostToolUse' ? 'Write' : 'Bash';
  return 'Bash';
}

function inferFilePath(command) {
  if (!command) return '';
  const patterns = [
    /(?:^|\s)(?:cat|sed|tee)\s+[^>]*?((?:\.\/)?\.sgo\/[^\s'"]+)/,
    />\s*((?:\.\/)?\.sgo\/[^\s'"]+)/,
    /((?:\.\/)?\.sgo\/(?:drafts|chapters|outline|constitution|validation|tracking)\/[^\s'"]+)/,
  ];
  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) return match[1].replace(/^\.\//, '');
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
