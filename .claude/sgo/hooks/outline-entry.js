#!/usr/bin/env node
// SGO Hook: outline-entry
// Stage: outline (构架)
// Type: entry (PreToolUse)
// Purpose: 验证构架阶段前置条件——宪法已锁定、调研报告已生成

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
    const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const toolName = (data.tool_name || '');

    // 第零层：非破坏性工具始终放行
    if (['Read', 'Glob', 'Grep', 'Agent', 'LSP', 'ListMcpResourcesTool', 'ReadMcpResourceTool'].includes(toolName)) {
      process.exit(0);
    }

    if (toolName === 'Bash') {
      process.exit(0);
    }

    // 允许编辑前置条件文件本身（宪法文件），以便锁定
    const toolInput = data.tool_input || {};
    const targetPath = toolInput.file_path || '';
    if (targetPath && targetPath.includes('.sgo/constitution/constitution.md')) {
      process.exit(0);
    }

    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 第一层：STATE.md 是否存在
    if (!fs.existsSync(stateFile)) {
      // .sgo/ 未初始化，静默通过
      process.exit(0);
    }

    const stateContent = fs.readFileSync(stateFile, 'utf8');

    // 第二层：阶段守卫——只在 outline 阶段执行检查
    const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
    if (!stageMatch || stageMatch[1].trim() !== 'outline') {
      // 不在 outline 阶段，静默通过
      process.exit(0);
    }

    // 第三层：业务逻辑——宪法必须已锁定
    const constFile = path.join(cwd, '.sgo', 'constitution', 'constitution.md');
    if (!fs.existsSync(constFile)) {
      const output = {
        decision: "block",
        reason: "SGO outline-entry: 宪法尚未生成。请先完成立宪阶段。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    const constContent = fs.readFileSync(constFile, 'utf8');
    const statusMatch = constContent.match(/status:\s*(\w+)/);
    if (!statusMatch || statusMatch[1] !== 'locked') {
      const output = {
        decision: "block",
        reason: "SGO outline-entry: 宪法尚未锁定，请先完成立宪阶段。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    // 第四层：调研报告必须已生成（大纲需要调研内容）
    const reportFile = path.join(cwd, '.sgo', 'research', 'report.md');
    if (!fs.existsSync(reportFile)) {
      const output = {
        decision: "block",
        reason: "SGO outline-entry: 调研报告尚未生成，请先完成调研阶段。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    const reportContent = fs.readFileSync(reportFile, 'utf8');
    if (reportContent.length < 200) {
      const output = {
        decision: "block",
        reason: "SGO outline-entry: 调研报告内容不足，无法生成大纲。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    // 前置条件满足，允许操作
    process.exit(0);
  } catch (e) {
    // 解析错误时 fail-open
    process.exit(0);
  }
});
