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

    if (fs.existsSync(continueFile)) {
      const content = fs.readFileSync(continueFile, 'utf8');
      const statusMatch = content.match(/status:\s*(\S+)/);
      const chapterMatch = content.match(/current_chapter:\s*(\S+)/);

      if (statusMatch && statusMatch[1] !== 'not_started') {
        const output = {
          decision: "allow",
          reason: "SGO: 检测到未完成的写作断点",
          hookSpecificOutput: {
            additionalContext: `[SGO 会话恢复] 发现 .continue-here.md，状态: ${statusMatch[1]}${chapterMatch && chapterMatch[1] !== 'null' ? '，当前章节: ' + chapterMatch[1] : ''}。请读取 .sgo/.continue-here.md 恢复上下文。`
          }
        };
        process.stdout.write(JSON.stringify(output));
      }
    }
    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
