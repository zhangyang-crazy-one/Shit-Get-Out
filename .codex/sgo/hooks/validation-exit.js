#!/usr/bin/env node
// SGO Hook: validation-exit
// Stage: validation (验证)
// Type: exit (PostToolUse)
// Purpose: 检测验证报告完成，实现 VALD-02 修订循环决策和 VALD-03 Abort Gate

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

    // 路径过滤：只在写入 .sgo/validation/ 目录时触发检查
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || '';

    if (!filePath.includes('.sgo/validation/')) {
      process.exit(0);
    }

    const cwd = data.cwd || process.env.CODEX_PROJECT_DIR || process.cwd();
    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 阶段守卫：只在 validation 阶段执行检查
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
      if (!stageMatch || stageMatch[1].trim() !== 'validation') {
        process.exit(0);
      }
    }

    // 验证报告文件检查
    const reportFile = path.join(cwd, '.sgo', 'validation', 'report.md');
    if (!fs.existsSync(reportFile)) {
      process.exit(0);
    }

    const content = fs.readFileSync(reportFile, 'utf8');
    if (content.length < 100) {
      process.exit(0);
    }

    // 解析验证结果：检查 issues 中是否有 blocker
    const blockerMatch = content.match(/severity:\s*blocker/gi);
    const warningMatch = content.match(/severity:\s*warning/gi);

    // 检查迭代次数（从报告或 STATE 中获取）
    const iterationMatch = content.match(/iteration:\s*(\d+)/);
    const iteration = iterationMatch ? parseInt(iterationMatch[1]) : 1;

    // VALD-03: Abort Gate — 3次迭代后仍有 blocker 则终止
    if (blockerMatch && iteration >= 3) {
      const output = {
        decision: "block",
        reason: "SGO VALD-03: 验证迭代已达3次上限，仍存在 BLOCKER 问题。流程已升级至人工审核。",
        hookSpecificOutput: {
          additionalContext: `[SGO] VALD-03 ABORT: 验证失败 ${iteration} 次，问题报告：\n${content.substring(0, 1000)}\n[需要人工介入解决 BLOCKER 后重试]`
        }
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    // VALD-02: 修订循环决策
    if (blockerMatch) {
      // 有 BLOCKER，需要修订
      const output = {
        decision: "block",
        reason: `SGO VALD-02: 验证发现 ${blockerMatch.length} 个 BLOCKER 问题，需要修订大纲。迭代 ${iteration}/3。`,
        hookSpecificOutput: {
          additionalContext: `[SGO] VALD-02: 验证未通过，需要修订。请根据验证报告修复 BLOCKER 问题后重试。\n验证报告摘要：\n${content.substring(0, 800)}`
        }
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    // 验证通过（无 BLOCKER）
    const output = {
      decision: "allow",
      reason: "SGO: 验证通过，大纲符合宪法要求",
      hookSpecificOutput: {
        additionalContext: "[SGO] 验证通过（VALD-01/02/03），大纲已通过宪法合规性检查。写作引擎可以开始场景构建。"
      }
    };
    process.stdout.write(JSON.stringify(output));
    process.exit(0);
  } catch (e) {
    process.exit(0);
  }
});
