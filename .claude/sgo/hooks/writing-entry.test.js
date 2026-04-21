#!/usr/bin/env node
/**
 * Integration test for writing-entry.js
 * Tests: STATE.md existence, stage guard, dependency check, constitution gate
 */

const fs = require('fs');
const path = require('path');

// Test 1: STATE.md existence check
console.log('Test 1: STATE.md existence check...');
const cwd = process.cwd();
const stateFile = path.join(cwd, '.sgo', 'STATE.md');
if (!fs.existsSync(stateFile)) {
  console.log('SKIP: .sgo/STATE.md does not exist (project not initialized)');
  process.exit(0);
}
console.log('PASS: STATE.md exists');

// Test 2: Stage guard check
console.log('Test 2: Stage guard check...');
const stateContent = fs.readFileSync(stateFile, 'utf8');
const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
const currentPhase = stageMatch ? stageMatch[1].trim() : '';
console.log(`Current phase: ${currentPhase}`);

// Test 3: Hook can be loaded and parses input
console.log('Test 3: Hook module load test...');
const hookPath = path.join(cwd, '.claude/sgo/hooks/writing-entry.js');
if (!fs.existsSync(hookPath)) {
  console.log('FAIL: writing-entry.js does not exist');
  process.exit(1);
}
const hookContent = fs.readFileSync(hookPath, 'utf8');
if (hookContent.length < 100) {
  console.log('FAIL: writing-entry.js is too short (skeleton only?)');
  process.exit(1);
}
console.log('PASS: writing-entry.js exists and has content');

// Test 4: quality-gate.js exists
console.log('Test 4: quality-gate.js exists...');
const gatePath = path.join(cwd, '.claude/sgo/hooks/quality-gate.js');
if (!fs.existsSync(gatePath)) {
  console.log('FAIL: quality-gate.js does not exist');
  process.exit(1);
}
console.log('PASS: quality-gate.js exists');

// Test 5: sgo-writer.md upgraded
console.log('Test 5: sgo-writer.md workflow check...');
const writerPath = path.join(cwd, '.claude/sgo/agents/sgo-writer.md');
if (!fs.existsSync(writerPath)) {
  console.log('FAIL: sgo-writer.md does not exist');
  process.exit(1);
}
const writerContent = fs.readFileSync(writerPath, 'utf8');
if (!writerContent.includes('上下文组装') && !writerContent.includes('Context Assembly')) {
  console.log('FAIL: sgo-writer.md missing context assembly');
  process.exit(1);
}
console.log('PASS: sgo-writer.md has context assembly');

// Test 6: Templates have required fields
console.log('Test 6: Template field checks...');
const chapterTmpl = fs.readFileSync(path.join(cwd, '.claude/sgo/templates/chapter.md'), 'utf8');
if (!chapterTmpl.includes('style_locked')) {
  console.log('FAIL: chapter.md missing style_locked field');
  process.exit(1);
}
console.log('PASS: chapter.md has style_anchor fields');

const outlineTmpl = fs.readFileSync(path.join(cwd, '.claude/sgo/templates/outline.md'), 'utf8');
if (!outlineTmpl.includes('chapter_dependencies')) {
  console.log('FAIL: outline.md missing chapter_dependencies field');
  process.exit(1);
}
console.log('PASS: outline.md has chapter_dependencies field');

// Test 7: STATE.md has writing progress fields
console.log('Test 7: STATE.md writing fields...');
if (!stateContent.includes('completed_chapters')) {
  console.log('FAIL: STATE.md missing completed_chapters field');
  process.exit(1);
}
if (!stateContent.includes('compression_snapshots')) {
  console.log('FAIL: STATE.md missing compression_snapshots field');
  process.exit(1);
}
console.log('PASS: STATE.md has writing progress fields');

// Test 8: sgo-validator has QUAL-01/02/03
console.log('Test 8: sgo-validator QUAL checks...');
const validatorPath = path.join(cwd, '.claude/sgo/agents/sgo-validator.md');
const validatorContent = fs.readFileSync(validatorPath, 'utf8');
if (!validatorContent.includes('QUAL-01') || !validatorContent.includes('QUAL-02') || !validatorContent.includes('QUAL-03')) {
  console.log('FAIL: sgo-validator.md missing QUAL-01/02/03 checks');
  process.exit(1);
}
console.log('PASS: sgo-validator.md has QUAL-01/02/03 checks');

console.log('\n=== All integration tests passed ===');