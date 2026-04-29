#!/usr/bin/env node
// SGO Hook: research-exit
// Stage: research (调研)
// Type: exit (PostToolUse)
// Purpose: 检测调研报告生成完成，向 Claude 注入完成上下文信息

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

    const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
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
        upsertResearchHandoffStatus(stateFile, 'awaiting_user_confirmation');
        const output = {
          decision: "block",
          reason: "SGO Research complete: 调研已完成。请先向用户汇报调研结论并询问是否进入立宪阶段；用户确认后，再继续后续流程。",
          hookSpecificOutput: {
            additionalContext: "[SGO] 调研阶段完成，报告已写入 .sgo/research/report.md。\n下一步不要自动进入立宪：请先向用户汇报调研结论，并明确询问是否进入立宪阶段。\n用户确认后，请先将 `.sgo/STATE.md` 中 `research_handoff_status` 更新为 `confirmed`，再继续立宪。"
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

function upsertResearchHandoffStatus(stateFile, value) {
  if (!fs.existsSync(stateFile)) return;

  const stateContent = fs.readFileSync(stateFile, 'utf8');
  let next = stateContent;

  if (/^research_handoff_status:\s*/m.test(next)) {
    next = next.replace(/^research_handoff_status:\s*.*/m, `research_handoff_status: ${value}`);
  } else {
    next = `${next.trimEnd()}\n\n## 阶段交接\n\nresearch_handoff_status: ${value}\n`;
  }

  if (next !== stateContent) {
    fs.writeFileSync(stateFile, next);
  }
}
