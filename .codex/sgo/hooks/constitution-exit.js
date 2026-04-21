#!/usr/bin/env node
// SGO Hook: constitution-exit
// Stage: constitution (立宪)
// Type: exit (PostToolUse)
// Purpose: 检测宪法文件生成完成，验证锁定状态，向 Codex 注入构架阶段衔接上下文

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

    // 路径过滤：只在写入 .sgo/constitution/ 目录时触发检查
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || '';

    if (!filePath.includes('.sgo/constitution/')) {
      process.exit(0);
    }

    const cwd = data.cwd || process.env.CODEX_PROJECT_DIR || process.cwd();
    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 阶段守卫：只在 constitution 阶段执行检查
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
      if (!stageMatch || stageMatch[1].trim() !== 'constitution') {
        process.exit(0);
      }
    }

    // 验证宪法文件已生成且锁定
    const constFile = path.join(cwd, '.sgo', 'constitution', 'constitution.md');
    if (fs.existsSync(constFile)) {
      const content = fs.readFileSync(constFile, 'utf8');

      // 检查 1：内容实质性（>500 字符）
      if (content.length > 500) {
        // 检查 2：status 字段为 locked
        const statusMatch = content.match(/status:\s*(\w+)/);
        if (statusMatch && statusMatch[1] === 'locked') {
          // 检查 3：铁律层非空（"## 铁律层"标题后应有内容）
          const ironRulesSection = content.split('## 铁律层');
          if (ironRulesSection.length > 1 && ironRulesSection[1].length > 50) {
            // 所有检查通过——注入下游阶段衔接上下文
            const output = {
              decision: "allow",
              reason: "SGO: 创作宪法已生成并锁定",
              hookSpecificOutput: {
                additionalContext: "[SGO] 立宪阶段完成，宪法已锁定于 .sgo/constitution/constitution.md。构架引擎可基于宪法和调研报告生成故事大纲。"
              }
            };
            process.stdout.write(JSON.stringify(output));
          }
        }
      }
    }

    process.exit(0);
  } catch (e) {
    // 解析错误时 fail-open
    process.exit(0);
  }
});
