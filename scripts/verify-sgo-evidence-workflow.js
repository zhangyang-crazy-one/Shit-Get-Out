#!/usr/bin/env node
// verify-sgo-evidence-workflow.js - deterministic marker checks for Phase 12.

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const checks = [
  {
    file: '.claude/sgo/config/methodology-overrides/tech-paper.json',
    markers: ['claim_label_policy', 'evidence_map_schema', 'unsupported_factual_claim_severity'],
  },
  {
    file: '.claude/sgo/templates/research-report.md',
    markers: ['evidence_map', 'claim_inventory', 'source_conflicts'],
  },
  {
    file: '.claude/sgo/templates/outline.md',
    markers: ['claim_label', 'evidence_refs', 'conflict_notes'],
  },
  {
    file: '.claude/sgo/agents/sgo-researcher.md',
    markers: ['阶段 2.5：学术证据地图与 Claim Inventory', 'claim_label_policy', 'evidence_map_schema'],
  },
  {
    file: '.claude/sgo/agents/sgo-outliner.md',
    markers: ['claim_inventory', 'evidence_map', 'claim_block', 'conflict_notes'],
  },
  {
    file: '.claude/sgo/agents/sgo-writer.md',
    markers: ['步骤 2.6: Claim Label 写作姿态控制', 'unsupported_claims', 'citation_placeholders'],
  },
  {
    file: '.claude/sgo/agents/sgo-validator.md',
    markers: ['Claim Label Evidence Validation', 'claim_label_validation', 'missing_evidence_refs'],
  },
  {
    file: '.codex/sgo/config/methodology-overrides/tech-paper.json',
    markers: ['claim_label_policy', 'evidence_map_schema'],
  },
  {
    file: '.codex/sgo/templates/research-report.md',
    markers: ['claim_inventory', 'source_conflicts'],
  },
  {
    file: '.codex/sgo/templates/outline.md',
    markers: ['claim_label', 'evidence_refs', 'conflict_notes'],
  },
  {
    file: '.codex/agents/sgo-validator.toml',
    markers: ['claim_label_validation', 'missing_evidence_refs', 'citation_warnings'],
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
    console.error('SGO evidence workflow verification: FAIL');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('SGO evidence workflow verification: PASS');
  for (const check of checks) {
    console.log(`- ${check.file}: ${check.markers.join(', ')}`);
  }
}

main();
