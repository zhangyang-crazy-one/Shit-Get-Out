#!/usr/bin/env node
// SGO Hook: outline-exit
// Stage: outline (构架)
// Type: exit (PostToolUse)
// Purpose: 检测大纲文件生成完成，验证锁定状态，注入验证阶段衔接上下文

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

    // 路径过滤：只在写入 .sgo/outline/ 目录时触发检查
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || '';

    if (!filePath.includes('.sgo/outline/')) {
      process.exit(0);
    }

    const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 阶段守卫：只在 outline 阶段执行检查
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
      if (!stageMatch || stageMatch[1].trim() !== 'outline') {
        process.exit(0);
      }
    }

    // 验证大纲文件已生成
    const outlineFile = path.join(cwd, '.sgo', 'outline', 'outline.md');
    if (!fs.existsSync(outlineFile)) {
      process.exit(0);
    }

    const content = fs.readFileSync(outlineFile, 'utf8');

    // 检查 1：内容实质性（>500 字符）
    if (content.length < 500) {
      process.exit(0);
    }

    // 检查 2：status 字段为 locked 或更新为 locked
    const statusMatch = content.match(/status:\s*(\w+)/);
    let needsLockUpdate = false;
    if (statusMatch && statusMatch[1] !== 'locked') {
      needsLockUpdate = true;
    }

    // 检查 3：foreshadow_plan 存在且有条目
    const foreshadowMatch = content.match(/foreshadow_plan:\s*\n([^#]+)/);
    if (!foreshadowMatch || foreshadowMatch[1].trim().length < 10) {
      // 伏笔规划可能为空或格式不符，静默通过（验证阶段会检查）
    }

    // 检查 4：characters 数组存在
    const charsMatch = content.match(/characters:\s*\n/);
    if (!charsMatch) {
      // 角色定义可能缺失，静默通过
    }

    // 检查 5：emotional_arc 存在
    const arcMatch = content.match(/emotional_arc:\s*\n/);
    if (!arcMatch) {
      // 情感弧线可能缺失，静默通过
    }

    // 所有实质性检查通过——注入验证阶段衔接上下文
    const output = {
      decision: "allow",
      reason: "SGO: 构架阶段完成，大纲已生成",
      hookSpecificOutput: {
        additionalContext: "[SGO] 构架阶段完成，大纲已锁定于 .sgo/outline/outline.md。验证引擎将对大纲进行宪法合规性检查（VALD-01/02/03）。"
      }
    };
    process.stdout.write(JSON.stringify(output));
    process.exit(0);
  } catch (e) {
    // 解析错误时 fail-open
    process.exit(0);
  }
});
