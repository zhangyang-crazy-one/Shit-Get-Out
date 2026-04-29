#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const jsonMode = args.has('--json');

const root = process.cwd();

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function checkNodeSyntax(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) return { ok: false, detail: 'missing' };
  const result = spawnSync('node', ['--check', abs], { encoding: 'utf8' });
  return {
    ok: result.status === 0,
    detail: result.status === 0 ? 'ok' : (result.stderr || result.stdout || 'syntax error').trim(),
  };
}

function checkSkillDir(name) {
  const skillFile = `.codex/skills/${name}/SKILL.md`;
  if (!exists(skillFile)) return { ok: false, detail: `${skillFile} missing` };
  const content = fs.readFileSync(path.join(root, skillFile), 'utf8');
  const hasCommandRef = content.includes(`.codex/sgo/commands/${name}.md`);
  return { ok: hasCommandRef, detail: hasCommandRef ? 'ok' : 'missing command reference' };
}

function summarizeGroup(items) {
  const passed = items.filter(item => item.ok).length;
  return {
    passed,
    total: items.length,
    ok: passed === items.length,
  };
}

const requiredDirs = [
  '.sgo',
  '.sgo/research',
  '.sgo/constitution',
  '.sgo/outline',
  '.sgo/drafts',
  '.sgo/chapters',
  '.sgo/validation',
  '.sgo/tracking',
  '.sgo/output',
  '.sgo/memory',
  '.sgo/authorship',
];

const hookFiles = [
  'research-entry.js',
  'research-exit.js',
  'constitution-entry.js',
  'constitution-exit.js',
  'outline-entry.js',
  'outline-exit.js',
  'validation-entry.js',
  'validation-exit.js',
  'writing-entry.js',
  'writing-exit.js',
  'finalize-entry.js',
  'finalize-exit.js',
  'quality-gate.js',
  'session-start.js',
];

const commandNames = [
  'sgo-discuss',
  'sgo-fix',
  'sgo-init',
  'sgo-start',
  'sgo-status',
  'sgo-write',
  'sgo-continue',
  'sgo-validate',
  'sgo-review',
  'sgo-export',
  'sgo-doctor',
];

const agentFiles = [
  'sgo-researcher.toml',
  'sgo-designer.toml',
  'sgo-constitutioner.toml',
  'sgo-outliner.toml',
  'sgo-validator.toml',
  'sgo-writer.toml',
  'sgo-finalizer.toml',
  'sgo-tracker.toml',
];

const configFiles = [
  'web-novel.md',
  'short-story.md',
  'detective.md',
  'romance.md',
  'philosophical.md',
  'sci-fi.md',
  'tech-paper.md',
];

const structureChecks = requiredDirs.map(relPath => ({
  name: relPath,
  ok: exists(relPath),
  detail: exists(relPath) ? 'ok' : 'missing',
}));

const hookChecks = hookFiles.map(file => ({
  name: file,
  ...checkNodeSyntax(`.codex/sgo/hooks/${file}`),
}));

const commandChecks = commandNames.map(name => ({
  name,
  ...checkSkillDir(name),
}));

const agentChecks = agentFiles.map(file => {
  const rel = `.codex/agents/${file}`;
  const ok = exists(rel);
  return { name: file, ok, detail: ok ? 'ok' : 'missing' };
});

const configChecks = configFiles.map(file => {
  const rel = `.codex/sgo/config/${file}`;
  if (!exists(rel)) return { name: file, ok: false, detail: 'missing' };
  const content = fs.readFileSync(path.join(root, rel), 'utf8');
  const required = ['quality_rules', 'template_variants', 'writing_flow'];
  const missing = required.filter(key => !content.includes(`${key}:`));
  return {
    name: file,
    ok: missing.length === 0,
    detail: missing.length === 0 ? 'ok' : `missing: ${missing.join(', ')}`,
  };
});

const hooksJsonExists = exists('.codex/hooks.json');
const hooksJson = hooksJsonExists
  ? JSON.parse(fs.readFileSync(path.join(root, '.codex/hooks.json'), 'utf8'))
  : null;
const hookRegistrationOk = Boolean(
  hooksJson?.hooks?.SessionStart &&
  hooksJson?.hooks?.PreToolUse &&
  hooksJson?.hooks?.PostToolUse
);

const groups = {
  structure: summarizeGroup(structureChecks),
  hooks: summarizeGroup(hookChecks),
  agents: summarizeGroup(agentChecks),
  commands: summarizeGroup(commandChecks),
  configs: summarizeGroup(configChecks),
  registrations: { passed: hookRegistrationOk ? 1 : 0, total: 1, ok: hookRegistrationOk },
};

const failures = [
  ...structureChecks.filter(item => !item.ok).map(item => `structure:${item.name}:${item.detail}`),
  ...hookChecks.filter(item => !item.ok).map(item => `hook:${item.name}:${item.detail}`),
  ...agentChecks.filter(item => !item.ok).map(item => `agent:${item.name}:${item.detail}`),
  ...commandChecks.filter(item => !item.ok).map(item => `command:${item.name}:${item.detail}`),
  ...configChecks.filter(item => !item.ok).map(item => `config:${item.name}:${item.detail}`),
];
if (!hookRegistrationOk) failures.push('hooks.json:missing required registrations');

const overall = failures.length === 0 ? 'HEALTHY' : (groups.structure.ok && groups.hooks.ok ? 'DEGRADED' : 'BROKEN');

const report = {
  overall_status: overall,
  groups,
  failures,
  repair_hints: [
    '缺失 skill / command 时补齐 `.codex/skills/<name>/SKILL.md` 与 `.codex/sgo/commands/<name>.md`。',
    'hook 语法失败时先运行 `node --check` 对应脚本并修复。',
    '配置缺字段时对照同类配置补齐 `quality_rules`、`template_variants`、`writing_flow`。',
  ],
};

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.overall_status === 'BROKEN' ? 2 : 0);
}

function formatGroup(label, group) {
  return `${label}: ${group.ok ? 'PASS' : 'FAIL'} (${group.passed}/${group.total})`;
}

const lines = [
  '=== SGO 系统诊断 ===',
  `总体状态: ${report.overall_status}`,
  formatGroup('基础结构', report.groups.structure),
  formatGroup('Hooks', report.groups.hooks),
  formatGroup('Agents', report.groups.agents),
  formatGroup('Commands', report.groups.commands),
  formatGroup('类型配置', report.groups.configs),
  formatGroup('Hook 注册', report.groups.registrations),
];

if (report.failures.length > 0) {
  lines.push('');
  lines.push('失败项详情:');
  for (const failure of report.failures) {
    lines.push(`- ${failure}`);
  }
}

if (report.repair_hints.length > 0) {
  lines.push('');
  lines.push('修复建议:');
  report.repair_hints.forEach((hint, index) => {
    lines.push(`${index + 1}. ${hint}`);
  });
}

console.log(lines.join('\n'));
process.exit(report.overall_status === 'BROKEN' ? 2 : 0);
