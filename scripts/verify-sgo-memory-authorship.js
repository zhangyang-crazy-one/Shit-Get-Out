#!/usr/bin/env node
// verify-sgo-memory-authorship.js - deterministic marker checks for Phase 13.

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const checks = [
  {
    file: '.claude/sgo/config/methodology-defaults.json',
    markers: ['story_facts_memory', 'writing_preferences_memory', 'style_disruptor'],
  },
  {
    file: '.claude/sgo/agents/sgo-writer.md',
    markers: ['.sgo/memory/long-term-memory.md', '.sgo/authorship/control.md', '对抗式节奏'],
  },
  {
    file: '.claude/sgo/hooks/writing-exit.js',
    markers: ['updateLongTermMemory', '.sgo/memory/long-term-memory.md', 'memory'],
  },
  {
    file: '.claude/sgo/hooks/quality-gate.js',
    markers: ['pacing_collapse', 'authorial_drift'],
  },
  {
    file: '.claude/sgo/agents/sgo-validator.md',
    markers: ['authorship_validation', 'Memory / Authorship Drift Validation'],
  },
  {
    file: '.claude/sgo/agents/sgo-finalizer.md',
    markers: ['.sgo/authorship/control.md', 'Authorship Control Audit', 'authorship_control'],
  },
  {
    file: '.codex/sgo/config/methodology-defaults.json',
    markers: ['story_facts_memory', 'writing_preferences_memory', 'style_disruptor'],
  },
  {
    file: '.codex/agents/sgo-writer.toml',
    markers: ['.sgo/memory/long-term-memory.md', '.sgo/authorship/control.md'],
  },
  {
    file: '.codex/sgo/hooks/writing-exit.js',
    markers: ['updateLongTermMemory', '.sgo/memory/long-term-memory.md'],
  },
  {
    file: '.codex/sgo/hooks/quality-gate.js',
    markers: ['pacing_collapse', 'authorial_drift'],
  },
  {
    file: '.codex/agents/sgo-validator.toml',
    markers: ['authorship_validation'],
  },
  {
    file: '.codex/agents/sgo-finalizer.toml',
    markers: ['authorship_control'],
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
    console.error('SGO memory/authorship verification: FAIL');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('SGO memory/authorship verification: PASS');
  for (const check of checks) {
    console.log(`- ${check.file}: ${check.markers.join(', ')}`);
  }
}

main();
