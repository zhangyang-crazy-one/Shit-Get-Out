#!/usr/bin/env node
// SGO Hook: finalize-exit
// Stage: finalize (终审)
// Type: exit (PostToolUse)
// Purpose: Output generation + revision loop trigger on FAIL
// D-01 Pattern: Real-time output via hookSpecificOutput
// D-03 Pattern: Auto-revision (STATE.md phase regression)

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 10000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', async () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const cwd = data.cwd || process.env.CODEX_PROJECT_DIR || process.cwd();

    // ====== Layer 1: Path filter ======
    // Trigger on .sgo/output/ file writes (finalization output generated)
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';

    if (!filePath.match(/\.sgo\/output\//)) {
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

    // ====== Layer 3: Read finalize result from STATE.md ======
    // D-03: Agent writes decision to STATE.md after audit; hook reads it directly.
    // This avoids the hook_specific_output data-flow problem where finalize_report
    // was never written by any hook (only the Agent writes it to STATE.md).
    let finalizeResult = { decision: null, blockers: [], warnings: [], revision_count: 0, abort_threshold: 3 };

    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');

      // Parse finalization_status from STATE.md
      const statusMatch = stateContent.match(/finalization_status:\s*\n([\s\S]*?)(?=\n\w|\n---|\n#)/);
      if (statusMatch) {
        const status = statusMatch[1];
        const decisionMatch = status.match(/^\s*decision:\s*"?([^"\n]+)"?/m);
        const revisionMatch = status.match(/^\s*revision_count:\s*(\d+)/m);
        const abortMatch = status.match(/^\s*abort_threshold:\s*(\d+)/m);
        const blockersMatch = status.match(/^\s*last_blockers:\s*(\[[\s\S]*?\])/m);
        const warningsMatch = status.match(/^\s*last_warnings:\s*(\[[\s\S]*?\])/m);

        if (decisionMatch) {
          finalizeResult.decision = decisionMatch[1].trim().replace(/"/g, '');
        }
        if (revisionMatch) {
          finalizeResult.revision_count = parseInt(revisionMatch[1]);
        }
        if (abortMatch) {
          finalizeResult.abort_threshold = parseInt(abortMatch[1]);
        }
        if (blockersMatch) {
          try {
            finalizeResult.blockers = JSON.parse(blockersMatch[1]);
          } catch (e) { /* ignore parse errors */ }
        }
        if (warningsMatch) {
          try {
            finalizeResult.warnings = JSON.parse(warningsMatch[1]);
          } catch (e) { /* ignore parse errors */ }
        }
      }
    }

    // If no decision recorded yet, Agent is still running — skip
    if (!finalizeResult.decision || finalizeResult.decision === "null") {
      process.exit(0);
    }

    // ====== Layer 4: Generate output (if PASS) ======
    let outputFiles = [];
    if (finalizeResult.decision === "PASS") {
      outputFiles = await generateOutput(cwd);
    }

    // ====== Layer 5: Handle decision ======
    // D-03: If FAIL, update STATE.md for revision loop
    let revisionTriggered = false;
    let abortTriggered = false;

    if (finalizeResult.decision === "FAIL") {
      const result = updateStateForRevision(stateFile, finalizeResult);
      revisionTriggered = true;
      abortTriggered = result.aborted;
    }

    // ====== Output (D-01: Real-time display via hookSpecificOutput) ======
    const output = {
      decision: finalizeResult.decision === "PASS" ? "allow" : "block",
      reason: finalizeResult.decision === "PASS"
        ? "SGO Finalize: All checks passed — output generated"
        : finalizeResult.decision === "ABORT"
          ? "SGO Finalize: ABORT — 3 revisions failed, human intervention required"
          : `SGO Finalize: ${finalizeResult.blockers?.length || 0} blockers found — revision triggered`,
      hookSpecificOutput: {
        finalize_report: {
          phase: "finalize",
          decision: finalizeResult.decision,
          revision_count: finalizeResult.revision_count || 0,
          abort_threshold: finalizeResult.abort_threshold || 3,
          blockers: finalizeResult.blockers || [],
          warnings: finalizeResult.warnings || [],
          output_files: outputFiles,
          revision_triggered: revisionTriggered,
          abort_triggered: abortTriggered
        }
      }
    };

    process.stdout.write(JSON.stringify(output));

    // Exit 0 for PASS, Exit 2 for FAIL/ABORT
    process.exit(finalizeResult.decision === "PASS" ? 0 : 2);

  } catch (e) {
    console.error('finalize-exit error:', e.message);
    // Fail-open (don't block on error)
    process.exit(0);
  }
});

/**
 * Generate output files using finalize-format.js
 */
async function generateOutput(cwd) {
  return new Promise((resolve) => {
    const formatScript = path.join(cwd, '.codex', 'sgo', 'scripts', 'finalize-format.js');

    if (!fs.existsSync(formatScript)) {
      console.error('finalize-format.js not found');
      resolve([]);
      return;
    }

    // Load project info from STATE.md
    const stateFile = path.join(cwd, '.sgo', 'STATE.md');
    let projectType = 'web-novel';
    let projectTitle = 'Untitled';

    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');

      const typeMatch = stateContent.match(/项目类型:\s*(.+)/);
      if (typeMatch) projectType = typeMatch[1].trim();

      const titleMatch = stateContent.match(/项目标题:\s*(.+)/);
      if (titleMatch) projectTitle = titleMatch[1].trim();
    }

    const child = spawn('node', [formatScript, cwd, projectType, projectTitle], { cwd });

    let output = '';
    child.stdout.on('data', (data) => { output += data.toString(); });
    child.stderr.on('data', (data) => { console.error('format error:', data.toString()); });

    child.on('close', () => {
      console.log('Output generation:', output.trim());

      // Extract generated file paths from output
      const filePaths = [];
      const pathRegex = /\.sgo\/output\/[^\n]+\.(txt|md|tex)/g;
      let pathMatch;
      while ((pathMatch = pathRegex.exec(output)) !== null) {
        filePaths.push(pathMatch[0]);
      }

      resolve(filePaths);
    });

    child.on('error', (e) => {
      console.error('Format script error:', e.message);
      resolve([]);
    });
  });
}

/**
 * Update STATE.md for revision loop
 * D-03: Auto-revision on FAIL
 */
function updateStateForRevision(stateFile, finalizeResult) {
  try {
    if (!fs.existsSync(stateFile)) {
      return { updated: false, aborted: false };
    }

    let stateContent = fs.readFileSync(stateFile, 'utf8');
    const abortThreshold = finalizeResult.abort_threshold || 3;
    const currentRevisionCount = finalizeResult.revision_count || 0;

    // Check abort condition
    if (currentRevisionCount >= abortThreshold) {
      // ABORT: 3 revisions failed, require human intervention
      stateContent = stateContent.replace(
        /(finalization_status:\s*\n\s*decision:).*/,
        '$1 "ABORT"'
      );
      stateContent = stateContent.replace(
        /(## Finalization Status[\s\S]*?)(last_blockers:).*/,
        (_prefix, section, blockersKey) => {
          const blockersStr = JSON.stringify(finalizeResult.blockers || []);
          return `${section}\n  decision: "ABORT"\n  ${blockersKey} ${blockersStr}`;
        }
      );
      fs.writeFileSync(stateFile, stateContent);
      return { updated: true, aborted: true };
    }

    // Increment revision count
    stateContent = stateContent.replace(
      /(finalization_status:\s*\n\s*revision_count:\s*)\d+/,
      (_prefix, key) => `${key}${currentRevisionCount + 1}`
    );

    // Update decision to FAIL
    stateContent = stateContent.replace(
      /(finalization_status:\s*\n\s*decision:).*/,
      '$1 "FAIL"'
    );

    // Update last_finalize_attempt
    stateContent = stateContent.replace(
      /(finalization_status:\s*\n\s*last_finalize_attempt:).*/,
      '$1 "' + new Date().toISOString() + '"'
    );

    // Store last blockers
    const blockersStr = JSON.stringify(finalizeResult.blockers || []);
    stateContent = stateContent.replace(
      /(finalization_status:[\s\S]*?last_blockers:)\s*\[[\s\S]*?\]/,
      (_prefix, key) => `${key} ${blockersStr}`
    );

    // Revert current_phase to writing (D-03)
    stateContent = stateContent.replace(
      /(当前阶段:\s*)finalize/,
      '$1writing'
    );

    fs.writeFileSync(stateFile, stateContent);
    return { updated: true, aborted: false };

  } catch (e) {
    console.error('Error updating STATE.md:', e.message);
    return { updated: false, aborted: false };
  }
}
