#!/usr/bin/env node
// SGO Hook: session-start
// Triggered on: SessionStart event
// Purpose: Detect .continue-here.md and notify about pending resume

const fs = require('fs');
const path = require('path');

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 10000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const cwd = data.cwd || process.cwd();
    const continueFile = path.join(cwd, '.sgo', '.continue-here.md');
    const methodologyFile = path.join(cwd, '.sgo', 'methodology', 'profile.resolved.json');
    const contexts = [];

    if (fs.existsSync(continueFile)) {
      const content = fs.readFileSync(continueFile, 'utf8');
      const statusMatch = content.match(/status:\s*(\S+)/);
      const chapterMatch = content.match(/current_chapter:\s*(\S+)/);

      if (statusMatch && statusMatch[1] !== 'not_started') {
        contexts.push(`[SGO 会话恢复] 发现 .continue-here.md，状态: ${statusMatch[1]}${chapterMatch && chapterMatch[1] !== 'null' ? '，当前章节: ' + chapterMatch[1] : ''}。请读取 .sgo/.continue-here.md 恢复上下文。`);
      }
    }

    if (fs.existsSync(methodologyFile)) {
      const methodology = JSON.parse(fs.readFileSync(methodologyFile, 'utf8'));
      const warnings = methodology.governance_warnings || [];
      const status = methodology.minimum_viable_context_check?.status || 'unknown';
      contexts.push(`[SGO 方法论] 已解析 methodology_profile（genre=${methodology.genre}，minimum_context=${status}）。`);
      if (warnings.length > 0) {
        contexts.push(`[SGO 方法论警告] ${warnings.join('；')}`);
      }
    }

    if (contexts.length > 0) {
      const output = {
        decision: "allow",
        reason: "SGO: 检测到会话恢复或方法论上下文",
        hookSpecificOutput: {
          additionalContext: contexts.join('\n')
        }
      };
      process.stdout.write(JSON.stringify(output));
    }
    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
