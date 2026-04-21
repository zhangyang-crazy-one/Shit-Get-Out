#!/usr/bin/env node
// SGO Hook: design-exit
// Stage: design (风格设计)
// Type: exit (PostToolUse)
// Status: skeleton (Phase 1) — logic to be filled in later phases

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 10000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    // TODO: Phase-specific logic to be implemented in later phases
    // data contains: session_id, tool_name, tool_input, tool_output, cwd, etc.
    process.exit(0); // Allow by default in skeleton phase
  } catch (e) {
    process.exit(0); // Fail-open: allow on parse errors
  }
});
