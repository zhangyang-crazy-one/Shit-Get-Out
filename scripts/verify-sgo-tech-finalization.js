#!/usr/bin/env node
// verify-sgo-tech-finalization.js - marker checks for tech-paper review/finalization hardening.

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const checks = [
  {
    file: '.claude/sgo/agents/sgo-writer.md',
    markers: ['local_result_sources', 'provenance_status', 'versioned_result_bundle'],
  },
  {
    file: '.claude/sgo/agents/sgo-finalizer.md',
    markers: ['优先扫描 `.sgo/drafts/`', 'Result Provenance Audit (tech-paper only)', 'local_result_sources'],
  },
  {
    file: '.claude/sgo/commands/sgo-review.md',
    markers: ['`.sgo/drafts/`', '结构化结果包', 'methodology/profile.resolved.json'],
  },
  {
    file: '.claude/sgo/hooks/finalize-entry.js',
    markers: ['currentPhase !== \'review\' && currentPhase !== \'finalize\'', 'result-provenance.md', 'local_result_sources'],
  },
  {
    file: '.codex/agents/sgo-writer.toml',
    markers: ['local_result_sources', 'provenance_status', 'versioned_result_bundle'],
  },
  {
    file: '.codex/agents/sgo-finalizer.toml',
    markers: ['优先扫描 `.sgo/drafts/`', 'Result Provenance Audit (tech-paper only)', 'local_result_sources'],
  },
  {
    file: '.codex/sgo/commands/sgo-review.md',
    markers: ['`.sgo/drafts/`', '结构化结果包', 'methodology/profile.resolved.json'],
  },
  {
    file: '.codex/sgo/hooks/finalize-entry.js',
    markers: ['currentPhase !== \'review\' && currentPhase !== \'finalize\'', 'result-provenance.md', 'local_result_sources'],
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
    console.error('SGO tech finalization verification: FAIL');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('SGO tech finalization verification: PASS');
  for (const check of checks) {
    console.log(`- ${check.file}: ${check.markers.join(', ')}`);
  }
}

main();
