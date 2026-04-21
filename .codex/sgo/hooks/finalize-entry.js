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
    const cwd = data.cwd || process.env.CODEX_PROJECT_DIR || process.cwd();
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
    // Check STATE.md current_phase === 'finalize'
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
      const currentPhase = stageMatch ? stageMatch[1].trim() : '';

      if (currentPhase !== 'finalize') {
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
      if (!outlineContent.includes('status: complete')) {
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
    const chaptersDir = path.join(cwd, '.sgo', 'chapters');
    if (fs.existsSync(chaptersDir)) {
      const chapters = fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'));
      if (chapters.length === 0) {
        issues.push({
          layer: 3,
          check: "chapters_exist",
          issue: "章节目录为空，无法进入终审"
        });
      }
    } else {
      issues.push({
        layer: 3,
        check: "chapters_dir",
        issue: "章节目录不存在"
      });
    }

    // Check 4: No active drafts remaining
    const draftsDir = path.join(cwd, '.sgo', 'drafts');
    if (fs.existsSync(draftsDir)) {
      const drafts = fs.readdirSync(draftsDir).filter(f => f.endsWith('.md'));
      if (drafts.length > 0) {
        issues.push({
          layer: 3,
          check: "no_drafts",
          issue: `仍有 ${drafts.length} 个草稿未完成`
        });
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
