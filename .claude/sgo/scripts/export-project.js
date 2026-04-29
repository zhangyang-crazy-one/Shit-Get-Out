#!/usr/bin/env node
// SGO Script: export-project.js
// Purpose: Enforce final-state gate before publishing deliverables.

const fs = require('fs');
const path = require('path');
const {
  detectProjectTitle,
  detectProjectType,
  formatOutput,
  loadProjectChapters,
  normalizeFormatArg,
  readTextIfExists,
  resolveProjectLayout,
  toProjectRelative
} = require('./finalize-format');

function parseArgs(argv) {
  let projectDir = null;
  let formatArg = null;
  let allowDraft = false;

  for (const arg of argv) {
    if (arg === '--allow-draft') {
      allowDraft = true;
    } else if (!projectDir) {
      projectDir = arg;
    } else if (!formatArg) {
      formatArg = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!projectDir) {
    throw new Error('Usage: node export-project.js <projectDir> [txt|md|latex|txt,md] [--allow-draft]');
  }

  return { projectDir, formatArg, allowDraft };
}

function parseField(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/^["'`]|["'`]$/g, '');
    }
  }
  return '';
}

function parseFinalizationDecision(stateContent) {
  return parseField(stateContent, [
    /^  decision:\s*([A-Z]+)$/m,
    /^\s*decision:\s*"?([A-Z]+)"?$/m
  ]);
}

function parseCurrentPhase(stateContent) {
  return parseField(stateContent, [
    /^当前阶段:\s*(.+)$/m,
    /^\*\*当前阶段:\*\*\s*(.+)$/m
  ]);
}

function parseStageStatus(stateContent) {
  return parseField(stateContent, [
    /^阶段状态:\s*(.+)$/m,
    /^\*\*阶段状态:\*\*\s*(.+)$/m
  ]);
}

function parseContinuePhase(continueContent) {
  return parseField(continueContent, [
    /^\*\*当前阶段:\*\*\s*(.+)$/m,
    /^current_phase:\s*(.+)$/m,
    /^status:\s*(.+)$/m
  ]);
}

function ensureFinalState(layout, stateContent, options) {
  if (options.allowDraft) {
    return;
  }

  const currentPhase = parseCurrentPhase(stateContent);
  const stageStatus = parseStageStatus(stateContent);
  const finalDecision = parseFinalizationDecision(stateContent);
  const continuePhase = parseContinuePhase(readTextIfExists(layout.continueFile));
  const chapters = loadProjectChapters(layout.projectRoot);
  const reasons = [];

  if (finalDecision !== 'PASS') {
    reasons.push(`finalization_status.decision=${finalDecision || 'missing'}，未达到 PASS`);
  }
  if (currentPhase !== 'done') {
    reasons.push(`当前阶段=${currentPhase || 'missing'}，不是 done`);
  }
  if (!['completed', 'archived', 'final'].includes(stageStatus)) {
    reasons.push(`阶段状态=${stageStatus || 'missing'}，不是 completed/archived/final`);
  }
  if (continuePhase && !continuePhase.startsWith('done')) {
    reasons.push(`.continue-here 当前阶段=${continuePhase}，尚未进入终结态`);
  }
  if (chapters.length === 0) {
    reasons.push('未找到可导出的定稿章节');
  }

  if (reasons.length > 0) {
    throw new Error(`Refusing export: 项目尚未处于 final 状态。\n- ${reasons.join('\n- ')}`);
  }
}

function replaceOutputFilesBlock(stateContent, relativePaths) {
  const marker = 'finalization_status:';
  const start = stateContent.indexOf(marker);
  if (start === -1) {
    return stateContent;
  }

  const remainder = stateContent.slice(start);
  const nextHeadingMatch = remainder.match(/\n##\s+/);
  const end = nextHeadingMatch ? start + nextHeadingMatch.index : stateContent.length;
  const block = stateContent.slice(start, end);
  const lines = block.split('\n');
  const outputIndex = lines.findIndex((line) => /^\s*output_files:/.test(line));
  const rendered = relativePaths.length === 0
    ? ['  output_files: []']
    : ['  output_files:', ...relativePaths.map((file) => `    - "${file}"`)];

  if (outputIndex === -1) {
    lines.push(...rendered);
  } else {
    let endIndex = outputIndex + 1;
    while (endIndex < lines.length && /^\s+-\s/.test(lines[endIndex])) {
      endIndex += 1;
    }
    lines.splice(outputIndex, endIndex - outputIndex, ...rendered);
  }

  return `${stateContent.slice(0, start)}${lines.join('\n')}${stateContent.slice(end)}`;
}

function writeUpdatedState(layout, outputFiles) {
  const stateContent = readTextIfExists(layout.stateFile);
  const projectRelative = outputFiles
    .map((file) => toProjectRelative(layout.projectRoot, file))
    .sort((left, right) => {
      const leftRoot = left.startsWith('.sgo/') ? 1 : 0;
      const rightRoot = right.startsWith('.sgo/') ? 1 : 0;
      return leftRoot - rightRoot || left.localeCompare(right, 'zh-Hans-CN', { numeric: true });
    });

  const nextState = replaceOutputFilesBlock(stateContent, projectRelative);
  fs.writeFileSync(layout.stateFile, nextState, 'utf8');
  return projectRelative;
}

function countWords(chapters) {
  return chapters.reduce((total, chapter) => total + strip(chapter.content).length, 0);
}

function strip(text) {
  return text.replace(/\s+/g, '');
}

function main() {
  const { projectDir, formatArg, allowDraft } = parseArgs(process.argv.slice(2));
  const layout = resolveProjectLayout(projectDir);
  const stateContent = readTextIfExists(layout.stateFile);

  ensureFinalState(layout, stateContent, { allowDraft });

  const projectType = detectProjectType(layout, stateContent);
  const projectTitle = detectProjectTitle(layout, stateContent);
  const chapters = loadProjectChapters(projectDir);
  const formats = normalizeFormatArg(formatArg, projectType);
  const outputFiles = formatOutput(projectDir, projectType, chapters, projectTitle, {
    formats
  });
  const relativeFiles = writeUpdatedState(layout, outputFiles);

  console.log('=== 成品导出完成 ===');
  console.log(`格式: ${formats.join(', ')}`);
  console.log(`文件: ${relativeFiles.join(', ')}`);
  console.log(`总字数: ${countWords(chapters)}字`);
  console.log(`章节数: ${chapters.length}章`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
