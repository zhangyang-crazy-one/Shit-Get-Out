#!/usr/bin/env node
// SGO Hook: research-entry
// Stage: research (调研)
// Type: entry (PreToolUse)
// Purpose: 验证调研阶段前置条件——STATE.md 存在、当前处于 research 阶段、写作类型已识别

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
    if (['Read', 'Glob', 'Grep', 'Agent', 'LSP', 'ListMcpResourcesTool', 'ReadMcpResourceTool', 'Bash'].includes(toolName)) {
      process.exit(0);
    }

    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 检查 STATE.md 是否存在
    if (!fs.existsSync(stateFile)) {
      // .sgo/ 未初始化，静默通过（可能还在项目初始化阶段）
      process.exit(0);
    }

    const stateContent = fs.readFileSync(stateFile, 'utf8');

    // 阶段守卫：只在 research 阶段执行检查
    const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
    if (!stageMatch || stageMatch[1].trim() !== 'research') {
      // 不在 research 阶段，静默通过
      process.exit(0);
    }

    // 检查写作类型是否已识别（非 "-" 值）
    const genreMatch = stateContent.match(/写作类型:\s*(.+)/);
    if (!genreMatch || genreMatch[1].trim() === '-') {
      const output = {
        decision: "block",
        reason: "SGO research-entry: 写作类型尚未识别。请先运行 /sgo-start 输入主题并确认类型。"
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
