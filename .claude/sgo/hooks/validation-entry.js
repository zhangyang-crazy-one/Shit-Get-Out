#!/usr/bin/env node
// SGO Hook: validation-entry
// Stage: validation (验证)
// Type: entry (PreToolUse)
// Purpose: 验证验证阶段前置条件——大纲已锁定

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

    // Bash 用于读取和诊断，放行（写入保护由 git 和系统权限管理）
    if (toolName === 'Bash') {
      process.exit(0);
    }

    // 允许编辑前置条件文件本身（大纲文件），以便锁定
    const toolInput = data.tool_input || {};
    const targetPath = toolInput.file_path || '';
    if (targetPath && targetPath.includes('.sgo/outline/outline.md')) {
      process.exit(0);
    }

    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 第一层：STATE.md 是否存在
    if (!fs.existsSync(stateFile)) {
      process.exit(0);
    }

    const stateContent = fs.readFileSync(stateFile, 'utf8');

    // 第二层：阶段守卫——只在 validation 阶段执行检查
    const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
    if (!stageMatch || stageMatch[1].trim() !== 'validation') {
      process.exit(0);
    }

    // 第三层：业务逻辑——大纲必须已锁定
    const outlineFile = path.join(cwd, '.sgo', 'outline', 'outline.md');
    if (!fs.existsSync(outlineFile)) {
      const output = {
        decision: "block",
        reason: "SGO validation-entry: 大纲尚未生成，请先生成完整大纲。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    const outlineContent = fs.readFileSync(outlineFile, 'utf8');
    const statusMatch = outlineContent.match(/status:\s*(\w+)/);
    if (!statusMatch || statusMatch[1] !== 'locked') {
      const output = {
        decision: "block",
        reason: "SGO validation-entry: 大纲尚未锁定，请先生成完整大纲。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    // 内容实质性检查
    if (outlineContent.length < 500) {
      const output = {
        decision: "block",
        reason: "SGO validation-entry: 大纲内容不足，无法进行验证。"
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    // 前置条件满足，允许操作
    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
