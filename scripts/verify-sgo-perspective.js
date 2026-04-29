#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const gates = [
  '.codex/sgo/hooks/quality-gate.js',
  '.claude/sgo/hooks/quality-gate.js',
];

const sampleChapter = `---
chapter_number: 99
title: "视角回归样本"
word_count: 1600
status: draft
active_characters:
  - 宰我
  - 孔子
  - 子贡
foreshadow_planted: []
foreshadow_collected: []
---

## 场景正文

宰我立在门边，没有立刻开口。子贡看了他一眼。孔子知道宰我的锋利，却没有说话。

宰我又抬头看门外，心里明白那几个人只是来试探。孔子听得出院外的话不硬，只冷。宰我忽然笑了笑，仍没有先动。
`;

function runGate(gatePath, chapterPath) {
  const child = spawnSync('node', [gatePath, chapterPath], {
    cwd: projectRoot,
    encoding: 'utf8',
  });

  if (child.error) {
    throw child.error;
  }

  if (!child.stdout.trim()) {
    throw new Error(`${gatePath} produced empty stdout`);
  }

  return JSON.parse(child.stdout);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgo-perspective-'));
  const chapterPath = path.join(tempDir, 'chapter.md');
  fs.writeFileSync(chapterPath, sampleChapter);

  const failures = [];

  for (const gate of gates) {
    const absoluteGate = path.join(projectRoot, gate);
    if (!fs.existsSync(absoluteGate)) {
      failures.push(`missing gate: ${gate}`);
      continue;
    }

    const result = runGate(absoluteGate, chapterPath);
    const actual = result.step3?.actual;
    const consistent = result.step3?.consistent;
    const blockedAsFirstPerson = (result.step3?.violations || []).some(
      violation => violation.actual === 'first_person'
    );

    if (actual !== 'third_person_limited' || consistent !== true || blockedAsFirstPerson) {
      failures.push(`${gate} misclassified proper name: actual=${actual}, consistent=${consistent}`);
    }
  }

  fs.rmSync(tempDir, { recursive: true, force: true });

  if (failures.length > 0) {
    console.error('SGO perspective verification: FAIL');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('SGO perspective verification: PASS');
  for (const gate of gates) {
    console.log(`- ${gate}: 宰我 is not counted as first-person POV`);
  }
}

main();
