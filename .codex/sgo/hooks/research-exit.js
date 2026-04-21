#!/usr/bin/env node
// SGO Hook: research-exit
// Stage: research (调研)
// Type: exit (PostToolUse)
// Purpose: 检测调研报告生成完成，向 Codex 注入完成上下文信息

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

    // 只在写入 .sgo/research/ 目录时触发检查（路径过滤）
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || '';

    if (!filePath.includes('.sgo/research/')) {
      process.exit(0);
    }

    const cwd = data.cwd || process.env.CODEX_PROJECT_DIR || process.cwd();
    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 阶段守卫：只在 research 阶段执行检查
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
      if (!stageMatch || stageMatch[1].trim() !== 'research') {
        process.exit(0);
      }
    }

    const reportFile = path.join(cwd, '.sgo', 'research', 'report.md');

    // 检查调研报告是否已生成
    if (fs.existsSync(reportFile)) {
      const content = fs.readFileSync(reportFile, 'utf8');
      // 验证报告有实质内容（非空模板，至少 200 字符）
      if (content.length > 200) {
        const output = {
          decision: "allow",
          reason: "SGO: 调研报告已生成",
          hookSpecificOutput: {
            additionalContext: "[SGO] 调研阶段完成，报告已写入 .sgo/research/report.md。立宪引擎可基于此报告生成创作宪法。"
          }
        };
        process.stdout.write(JSON.stringify(output));
      }
    }

    process.exit(0);
  } catch (e) {
    // 解析错误时 fail-open
    process.exit(0);
  }
});
