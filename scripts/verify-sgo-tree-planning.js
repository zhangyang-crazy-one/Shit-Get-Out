#!/usr/bin/env node
// verify-sgo-tree-planning.js - deterministic marker checks for Phase 11.

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const checks = [
  {
    file: '.claude/sgo/templates/outline.md',
    markers: ['planning_mode_ref', 'tree_structure:', 'atomic_block_plan:', 'block_dependencies:'],
  },
  {
    file: '.claude/sgo/agents/sgo-outliner.md',
    markers: ['.sgo/methodology/profile.resolved.json', 'planning_mode', 'tree_structure', 'atomic_block_plan'],
  },
  {
    file: '.claude/sgo/agents/sgo-writer.md',
    markers: ['write_target', 'block_dependencies', 'local_context_refs'],
  },
  {
    file: '.codex/sgo/templates/outline.md',
    markers: ['tree_structure:'],
  },
  {
    file: '.codex/agents/sgo-outliner.toml',
    markers: ['atomic_block_plan'],
  },
  {
    file: '.codex/agents/sgo-writer.toml',
    markers: ['write_target'],
  },
];

function readFile(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function main() {
  const failures = [];

  for (const check of checks) {
    let content = '';
    try {
      content = readFile(check.file);
    } catch (error) {
      failures.push(error.message);
      continue;
    }

    for (const marker of check.markers) {
      if (!content.includes(marker)) {
        failures.push(`${check.file} missing marker: ${marker}`);
      }
    }
  }

  if (failures.length > 0) {
    console.error('SGO tree planning verification: FAIL');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('SGO tree planning verification: PASS');
  for (const check of checks) {
    console.log(`- ${check.file}: ${check.markers.join(', ')}`);
  }
}

main();
