#!/usr/bin/env node
// SGO Hook: finalize-entry
// Stage: finalize (终审)
// Type: exit (PostToolUse)
// Purpose: Finalization phase entry guard - verify prerequisites before finalization
// D-01 Pattern: Real-time output via hookSpecificOutput
// D-04 Pattern: Independent subagent execution

const fs = require('fs');
const path = require('path');

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 10000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const cwd = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const toolName = (data.tool_name || '');

    // 第零层：非破坏性工具始终放行
    if (['Read', 'Glob', 'Grep', 'Agent', 'LSP', 'ListMcpResourcesTool', 'ReadMcpResourceTool', 'Bash'].includes(toolName)) {
      process.exit(0);
    }

    // ====== Layer 1: Path filter ======
    // Trigger on .sgo/output/ writes (finalization output)
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';

    if (!filePath.match(/\.sgo\/(output|validation)\//)) {
      process.exit(0); // Not finalization output, skip
    }

    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // ====== Layer 2: Stage guard ======
    // Check STATE.md current_phase === 'review' | 'finalize'
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
      const currentPhase = stageMatch ? stageMatch[1].trim() : '';

      if (currentPhase !== 'review' && currentPhase !== 'finalize') {
        process.exit(0); // Not in finalize phase, skip
      }
    }

    // ====== Layer 3: Prerequisite checks ======
    const issues = [];

    // Check 1: Constitution is locked
    const constitutionFile = path.join(cwd, '.sgo', 'constitution', 'constitution.md');
    if (fs.existsSync(constitutionFile)) {
      const constitutionContent = fs.readFileSync(constitutionFile, 'utf8');
      if (!constitutionContent.includes('status: locked')) {
        issues.push({
          layer: 3,
          check: "constitution_locked",
          issue: "宪法未锁定，无法进入终审"
        });
      }
    } else {
      issues.push({
        layer: 3,
        check: "constitution_exists",
        issue: "宪法文件不存在"
      });
    }

    // Check 2: Outline is complete
    const outlineFile = path.join(cwd, '.sgo', 'outline', 'outline.md');
    if (fs.existsSync(outlineFile)) {
      const outlineContent = fs.readFileSync(outlineFile, 'utf8');
      if (!outlineContent.includes('status: complete') && !outlineContent.includes('status: locked')) {
        issues.push({
          layer: 3,
          check: "outline_complete",
          issue: "大纲未完成，无法进入终审"
        });
      }
    } else {
      issues.push({
        layer: 3,
        check: "outline_exists",
        issue: "大纲文件不存在"
      });
    }

    // Check 3: All chapters are written
    const draftsDir = path.join(cwd, '.sgo', 'drafts');
    const chaptersDir = path.join(cwd, '.sgo', 'chapters');
    const manuscriptFiles = [];
    if (fs.existsSync(draftsDir)) {
      manuscriptFiles.push(...fs.readdirSync(draftsDir).filter(f => /^chapter-\d+\.md$/.test(f)).map(f => path.join(draftsDir, f)));
    }
    if (manuscriptFiles.length === 0 && fs.existsSync(chaptersDir)) {
      manuscriptFiles.push(...fs.readdirSync(chaptersDir).filter(f => /^chapter-\d+\.md$/.test(f)).map(f => path.join(chaptersDir, f)));
    }
    if (manuscriptFiles.length === 0) {
      issues.push({
        layer: 3,
        check: "manuscript_exists",
        issue: "未找到可终审的章节正文（.sgo/drafts/ 或 .sgo/chapters/）"
      });
    }

    // Check 4: Tech-paper result provenance bundle
    const methodologyFile = path.join(cwd, '.sgo', 'methodology', 'profile.resolved.json');
    let genre = '';
    if (fs.existsSync(methodologyFile)) {
      try {
        const methodology = JSON.parse(fs.readFileSync(methodologyFile, 'utf8'));
        genre = methodology.genre || '';
      } catch (e) { /* ignore */ }
    }
    if (genre === 'tech-paper') {
      const resultChapter = manuscriptFiles.find(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('表1') || content.includes('表2') || content.includes('优于 baseline');
      });
      if (resultChapter) {
        const resultChapterContent = fs.readFileSync(resultChapter, 'utf8');
        const provenanceFile = path.join(cwd, '.sgo', 'output', 'result-provenance.md');
        if (!resultChapterContent.includes('local_result_sources:')) {
          issues.push({
            layer: 3,
            check: "local_result_sources",
            issue: "tech-paper 结果章节缺少 local_result_sources，无法验证本地结果来源"
          });
        }
        if (!fs.existsSync(provenanceFile)) {
          issues.push({
            layer: 3,
            check: "result_provenance_bundle",
            issue: "tech-paper 结果章节缺少 .sgo/output/result-provenance.md"
          });
        }
      }
    }

    // ====== Layer 4: Read STATE.md for revision tracking ======
    let revisionCount = 0;
    let abortThreshold = 3;
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');

      const revisionMatch = stateContent.match(/revision_count:\s*(\d+)/);
      revisionCount = revisionMatch ? parseInt(revisionMatch[1]) : 0;

      const abortMatch = stateContent.match(/abort_threshold:\s*(\d+)/);
      abortThreshold = abortMatch ? parseInt(abortMatch[1]) : 3;
    }

    // ====== Output ======
    const decision = issues.length === 0 ? "allow" : "block";

    const output = {
      decision,
      reason: decision === "allow"
        ? "SGO Finalize: All prerequisites met"
        : `SGO Finalize: ${issues.length} prerequisite(s) not met`,
      hookSpecificOutput: {
        finalize_entry: {
          phase: "finalize",
          prerequisites_checked: true,
          issues: issues,
          revision_count: revisionCount,
          abort_threshold: abortThreshold,
          ready_for_finalization: issues.length === 0
        }
      }
    };

    process.stdout.write(JSON.stringify(output));
    process.exit(decision === "allow" ? 0 : 2);

  } catch (e) {
    // Parse error, fail-open (don't block normal workflow)
    process.exit(0);
  }
});
