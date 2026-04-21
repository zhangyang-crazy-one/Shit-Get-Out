#!/usr/bin/env node
// SGO Hook: writing-entry
// Stage: writing (编写)
// Type: entry (PreToolUse)
// Purpose: VALD-01 Fast Gate — 编写前宪法铁律快速检查 + D-01 依赖检查

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

    // 允许编辑前置条件文件本身（大纲），以便锁定
    const toolInputEarly = data.tool_input || {};
    const targetPathEarly = toolInputEarly.file_path || '';
    if (targetPathEarly && targetPathEarly.includes('.sgo/outline/')) {
      process.exit(0);
    }

    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // 第一层：STATE.md 是否存在
    if (!fs.existsSync(stateFile)) {
      process.exit(0);
    }

    const stateContent = fs.readFileSync(stateFile, 'utf8');

    // 第二层：阶段守卫——只在 writing 阶段执行检查
    const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
    const currentPhase = stageMatch ? stageMatch[1].trim() : '';

    // 也允许从 outline/validation 阶段开始写（快速检查模式）
    if (currentPhase !== 'writing' && currentPhase !== 'outline' && currentPhase !== 'validation') {
      process.exit(0);
    }

    // 第三层：Fast Gate 三步检查
    const blockers = [];
    const warnings = [];

    // ====== 步骤 1: D-01 依赖检查 ======
    // 检查当前章节的依赖是否已满足
    const outlineFile = path.join(cwd, '.sgo', 'outline', 'outline.md');
    if (fs.existsSync(outlineFile)) {
      const outlineContent = fs.readFileSync(outlineFile, 'utf8');

      // 解析 chapter_dependencies
      const depsMatch = outlineContent.match(/chapter_dependencies:\s*\n([\s\S]*?)(?=\n\w|\n#|$)/);
      if (depsMatch) {
        const depsSection = depsMatch[1];
        const chapterDeps = {};

        // 解析每个章节的依赖
        const depLines = depsSection.matchAll(/^\s*(\w+):\s*\[(.*?)\]/gm);
        for (const match of depLines) {
          const chapterId = match[1];
          const depsStr = match[2].trim();
          chapterDeps[chapterId] = depsStr === '' ? [] : depsStr.split(',').map(d => d.trim().replace(/["']/g, ''));
        }

        // 从 tool_input 解析当前正在写的文件
        const toolInput = data.tool_input || {};
        const filePath = toolInput.file_path || toolInput.path || '';
        const draftMatch = filePath.match(/chapter[_-]?(\d+)/i);

        if (draftMatch) {
          const currentChapter = 'ch-' + draftMatch[1];

          // 检查当前章节的依赖
          const deps = chapterDeps[currentChapter] || [];

          // 从 STATE.md 解析已完成的章节
          const completedMatch = stateContent.match(/completed_chapters:\s*\n([\s\S]*?)(?=\ncompression_snapshots:|\n---|\n#|\n\n|$)/);
          const completedChapters = new Set();
          if (completedMatch) {
            const chapterMatches = completedMatch[1].matchAll(/chapter_id:\s*(\w+)/g);
            for (const m of chapterMatches) completedChapters.add(m[1]);
          }

          // 检查是否有未满足的依赖
          const unmetDeps = deps.filter(d => !completedChapters.has(d) && d !== '');
          if (unmetDeps.length > 0) {
            blockers.push({
              type: "dependency_not_met",
              finding: `章节 "${currentChapter}" 依赖未满足: ${unmetDeps.join(', ')}`,
              location: "outline.md > chapter_dependencies"
            });
          }
        }
      }
    }

    // ====== 步骤 2: Constitution Iron Rules 检查 ======
    const constFile = path.join(cwd, '.sgo', 'constitution', 'constitution.md');
    if (fs.existsSync(constFile)) {
      const constContent = fs.readFileSync(constFile, 'utf8');

      // 解析铁律层（"## 铁律层" 标题后内容）
      const ironRulesMatch = constContent.match(/## 铁律层\n([\s\S]*?)(?=\n##|\n#|$)/);
      if (ironRulesMatch && ironRulesMatch[1].length > 50) {
        const ironRules = ironRulesMatch[1];

        // 扫描大纲中是否有违反铁律的内容
        if (fs.existsSync(outlineFile)) {
          const outlineContent = fs.readFileSync(outlineFile, 'utf8');

          // 常见铁律违规模式检查
          // （实际实现时应解析具体铁律规则，这里做通用检查）
          const forbiddenPatterns = [
            { pattern: /政治敏感|领导人物|历史事件/, desc: "可能违反政治敏感性铁律" },
            { pattern: /暴力描写|血腥场景|虐待/, desc: "可能违反暴力内容铁律" }
          ];

          for (const rule of forbiddenPatterns) {
            if (rule.pattern.test(outlineContent)) {
              blockers.push({
                type: "iron_rule_violation",
                finding: rule.desc,
                location: "outline.md"
              });
            }
          }
        }
      }
    }

    // ====== 步骤 3: Foreshadow Completeness 检查 ======
    if (fs.existsSync(outlineFile)) {
      const outlineContent = fs.readFileSync(outlineFile, 'utf8');

      // 检查伏笔是否都有 collect_location
      const foreshadowMatches = outlineContent.matchAll(/-\s+id:\s*(\S+)\n\s+foreshadow:\s*[^\n]+\n\s+plant_status:\s*(\w+)/g);
      for (const match of foreshadowMatches) {
        const foreshadowId = match[1];
        const plantStatus = match[2];

        if (plantStatus === 'planted') {
          // 检查是否有对应的 collect_location
          const collectPattern = new RegExp(`id:\\s*${foreshadowId}[\\s\\S]*?collect_status:\\s*(\\w+)`, 'g');
          const collectMatch = collectPattern.exec(outlineContent);
          if (!collectMatch || !collectMatch[1] || collectMatch[1] === 'unplanted') {
            blockers.push({
              type: "foreshadow_incomplete",
              finding: `伏笔 "${foreshadowId}" 已种植但缺少收集位置`,
              location: "outline.md"
            });
          }
        }
      }
    }

    // ====== 步骤 4: Character Consistency 检查 ======
    if (fs.existsSync(outlineFile)) {
      const outlineContent = fs.readFileSync(outlineFile, 'utf8');

      // 检查 characters 数组中的必需字段
      const charBlockMatch = outlineContent.match(/characters:\s*\n([\s\S]*?)(?=\n\w|\n#|$)/);
      if (charBlockMatch) {
        const charsSection = charBlockMatch[1];
        const charMatches = charsSection.matchAll(/-\s+name:\s*(\S+)/g);

        const charNames = [];
        for (const charMatch of charMatches) {
          const charName = charMatch[1];
          charNames.push(charName);

          // 检查该角色是否有必需字段
          const charPattern = new RegExp(`name:\\s*${charName}[\\s\\S]*?(?=-\\s+name:|\\ncharacters:|$)`);
          const charDetailMatch = charPattern.exec(charsSection);

          if (charDetailMatch) {
            const charDetail = charDetailMatch[0];
            if (!charDetail.includes('arc:') && !charDetail.includes('character_arc:')) {
              warnings.push({
                type: "character_missing_field",
                finding: `角色 "${charName}" 缺少 character_arc 字段`,
                location: "outline.md > characters"
              });
            }
            if (!charDetail.includes('dialogue_style:')) {
              warnings.push({
                type: "character_missing_field",
                finding: `角色 "${charName}" 缺少 dialogue_style 字段`,
                location: "outline.md > characters"
              });
            }
          }
        }

        // 检查重名
        const nameCounts = {};
        for (const name of charNames) {
          nameCounts[name] = (nameCounts[name] || 0) + 1;
        }
        for (const [name, count] of Object.entries(nameCounts)) {
          if (count > 1) {
            blockers.push({
              type: "character_duplicate",
              finding: `角色 "${name}" 出现 ${count} 次，可能存在重复定义`,
              location: "outline.md > characters"
            });
          }
        }
      }
    }

    // ====== 输出决策 ======
    if (blockers.length > 0) {
      const output = {
        decision: "block",
        reason: `SGO VALD-01: Fast Gate 发现 ${blockers.length} 个 BLOCKER，无法开始写作。`,
        hookSpecificOutput: {
          validation_context: {
            passed: false,
            blockers: blockers,
            warnings: warnings,
            summary: `VALD-01 Fast Gate: ${blockers.length} blockers, ${warnings.length} warnings`
          }
        }
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(2);
    }

    if (warnings.length > 0) {
      // 有警告但允许继续
      const output = {
        decision: "allow",
        reason: `SGO VALD-01: Fast Gate 通过（${warnings.length} 个 WARNING，建议后续修复）`,
        hookSpecificOutput: {
          validation_context: {
            passed: true,
            blockers: [],
            warnings: warnings,
            summary: `VALD-01 Fast Gate: 0 blockers, ${warnings.length} warnings`
          }
        }
      };
      process.stdout.write(JSON.stringify(output));
      process.exit(0);
    }

    // 完全通过
    const output = {
      decision: "allow",
      reason: "SGO VALD-01: Fast Gate 全部检查通过",
      hookSpecificOutput: {
        validation_context: {
          passed: true,
          blockers: [],
          warnings: [],
          summary: "VALD-01 Fast Gate: All checks passed"
        }
      }
    };
    process.stdout.write(JSON.stringify(output));
    process.exit(0);
  } catch (e) {
    // 解析错误时 fail-open
    process.exit(0);
  }
});
