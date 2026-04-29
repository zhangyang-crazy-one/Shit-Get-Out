#!/usr/bin/env node
// SGO Hook: constitution-entry
// Stage: constitution (立宪)
// Type: entry (PreToolUse)
// Purpose: 验证立宪阶段前置条件——STATE.md 存在、当前处于 constitution 阶段、调研报告已生成

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

    // 允许编辑前置条件文件本身（调研报告），以便补充/修正
    const toolInput = data.tool_input || {};
    const targetPath = toolInput.file_path || '';
    if (targetPath && (
      targetPath.includes('.sgo/research/') ||
      targetPath.includes('.sgo/STATE.md') ||
      targetPath.includes('.sgo/.continue-here.md')
    )) {
      process.exit(0);
    }

    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 第一层：STATE.md 是否存在
    if (!fs.existsSync(stateFile)) {
      // .sgo/ 未初始化，静默通过（可能还在项目初始化阶段）
      process.exit(0);
    }

    const stateContent = fs.readFileSync(stateFile, 'utf8');

    // 第二层：阶段守卫——只在 constitution 阶段执行检查
    const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
    if (!stageMatch || stageMatch[1].trim() !== 'constitution') {
      // 不在 constitution 阶段，静默通过
      process.exit(0);
    }

    // 第三层：业务逻辑——调研报告必须已生成
    const reportFile = path.join(cwd, '.sgo', 'research', 'report.md');
    if (!fs.existsSync(reportFile)) {
      const output = {
        decision: "block",
        reason: "SGO constitution-entry: 调研报告尚未生成。请先完成调研阶段。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    // 验证报告有实质内容
    const reportContent = fs.readFileSync(reportFile, 'utf8');
    if (reportContent.length < 200) {
      const output = {
        decision: "block",
        reason: "SGO constitution-entry: 调研报告内容不足，无法生成宪法。请先完成完整的调研。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    const handoffMatch = stateContent.match(/^research_handoff_status:\s*(.+)$/m);
    const handoffStatus = handoffMatch ? handoffMatch[1].trim() : '';
    if (handoffStatus !== 'confirmed') {
      const output = {
        decision: "block",
        reason: "SGO constitution-entry: 调研完成后尚未得到用户确认。请先汇报调研结果并询问是否进入立宪阶段；确认后，将 `research_handoff_status` 设为 `confirmed` 再继续。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    // 前置条件满足，允许操作
    process.exit(0);
  } catch (e) {
    // 解析错误时 fail-open（不影响正常使用）
    process.exit(0);
  }
});
