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

    const parsed = parseHookPayload(result.stdout);
    const normalized = normalizeOutput(event, parsed);
    const handled = isHandledDecision(event, parsed);

    if (normalized.stdout) process.stdout.write(normalized.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    // Codex treats non-zero PostToolUse exits as hook failures. SGO hooks use
    // exit code 2 to signal structured "block / revise / abort" decisions, so
    // we translate those into protocol output and still exit 0.
    if (handled) process.exit(0);

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

function normalizeOutput(event, data) {
  if (!data) return { stdout: '', stderr: '' };

  if (event === 'SessionStart' && data.hookSpecificOutput?.additionalContext) {
    return {
      stdout: JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'SessionStart',
          additionalContext: data.hookSpecificOutput.additionalContext,
        },
      }),
      stderr: '',
    };
  }
  if (event === 'PreToolUse' && (data.decision === 'block' || data.decision === 'deny')) {
    return {
      stdout: JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: data.reason || 'Blocked by SGO hook.',
        },
      }),
      stderr: '',
    };
  }
  if (event === 'PostToolUse' && (data.decision === 'block' || data.decision === 'deny')) {
    return {
      stdout: JSON.stringify({
        continue: false,
        stopReason: data.reason || 'Blocked by SGO hook.',
        systemMessage: data.reason || 'Blocked by SGO hook.',
      }),
      stderr: '',
    };
  }
  if (event === 'PostToolUse') {
    const context = data.hookSpecificOutput?.additionalContext || data.reason;
    return {
      stdout: context ? JSON.stringify({ systemMessage: context }) : '',
      stderr: '',
    };
  }
  if (event === 'PreToolUse') return { stdout: '', stderr: '' };

  return {
    stdout: typeof data === 'string' ? data : JSON.stringify(data),
    stderr: '',
  };
}

function parseHookPayload(stdout) {
  if (!stdout) return null;

  const trimmed = stdout.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const lines = trimmed.split('\n').map(line => line.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      try {
        return JSON.parse(lines[i]);
      } catch {
        // ignore and continue scanning backwards
      }
    }
    return trimmed;
  }
}

function isHandledDecision(event, data) {
  if (event !== 'PostToolUse' && event !== 'PreToolUse') return false;
  if (!data || typeof data !== 'object') return false;
  return ['allow', 'block', 'deny'].includes(data.decision);
}
