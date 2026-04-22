#!/usr/bin/env node
// SGO Hook: writing-exit
// Stage: writing (编写)
// Type: exit (PostToolUse)
// Purpose: 检测章节完成完成，触发质量门控，更新 STATE.md 摘要链
// D-03 Pattern: Chapter summary chain for cross-session continuation
// D-04 Pattern: Trigger quality-gate on chapter completion
// D-05 Pattern: Compression trigger every 5 chapters
// Phase 13 Pattern: Persist long-term memory and authorship-related signals

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
    // 只在写入 .sgo/drafts/ 或 .sgo/chapters/ 文件时触发检查
    const toolInput = data.tool_input || {};
    const filePath = toolInput.file_path || toolInput.path || '';

    if (!filePath.match(/\.sgo\/(drafts|chapters)\//)) {
      process.exit(0); // Not a chapter write, skip
    }

    const stateFile = path.join(cwd, '.sgo', 'STATE.md');

    // ====== Layer 2: Stage guard ======
    // 检查 STATE.md current_phase === 'writing'
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const stageMatch = stateContent.match(/当前阶段:\s*(\S+)/);
      const currentPhase = stageMatch ? stageMatch[1].trim() : '';

      if (currentPhase !== 'writing') {
        process.exit(0); // Not in writing phase, skip
      }
    }

    // ====== Layer 3: Chapter completeness check ======
    // 验证写入的章节有：frontmatter、word_count > 0、content section
    const chapterContent = fs.readFileSync(filePath, 'utf8');

    const completenessIssues = [];

    // 检查必填 frontmatter
    if (!chapterContent.match(/^chapter_number:/m)) {
      completenessIssues.push('missing chapter_number');
    }
    if (!chapterContent.match(/^title:/m)) {
      completenessIssues.push('missing title');
    }

    // 检查字数
    const wordCountMatch = chapterContent.match(/word_count:\s*(\d+)/);
    const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : 0;
    if (wordCount === 0) {
      completenessIssues.push('word_count is 0 or missing');
    }

    // 检查内容区域
    if (!chapterContent.includes('## 场景正文') && !chapterContent.includes('## 正文')) {
      completenessIssues.push('missing content section');
    }

    // 如果章节不完整，静默跳过（可能还在写）
    if (completenessIssues.length > 0) {
      process.exit(0);
    }

    // ====== Layer 4: Trigger quality-gate ======
    // 生成质量门控检查结果
    const qualityResult = await triggerQualityGate(filePath, cwd);

    // ====== Layer 5: Update STATE.md chapter_summaries ======
    // 质量门控通过后，生成章节摘要并更新 STATE.md
    if (qualityResult.pass || qualityResult.warnings_only) {
      updateStateWithChapterSummary(stateFile, filePath, chapterContent, qualityResult);
      updateLongTermMemory(cwd, filePath, chapterContent, qualityResult);
    }

    // ====== Layer 5.5: Persist batch quality results (D-03 key-link) ======
    // 检查是否需要触发批量质量检查和结果持久化
    if (qualityResult.pass || qualityResult.warnings_only) {
      const batchCheckNeeded = checkBatchCheckTrigger(stateFile);
      if (batchCheckNeeded) {
        // 提取 step3/step4 结果（视角检测和质量评分）
        const batchResult = {
          total: qualityResult.step4?.total || 0,
          expected: qualityResult.step3?.expected || 'unknown',
          actual: qualityResult.step3?.actual || 'unknown',
          consistent: qualityResult.step3?.consistent !== false,
          blockers: qualityResult.step3?.violations || [],
          warnings: qualityResult.step4?.warnings || []
        };
        persistBatchResults(stateFile, batchResult);
      }
    }

    // ====== Layer 6: Check compression trigger (D-05) ======
    // 检查是否需要触发上下文压缩（每5章）
    const compressionNeeded = checkCompressionTrigger(stateFile);

    // ====== Layer 7: Session summary report (D-03) ======
    // Report this writing session's output to the user automatically
    const sessionSummary = buildSessionSummary(filePath, stateFile, wordCount, chapterContent);

    // ====== Output ======
    const output = {
      decision: qualityResult.pass ? "allow" : "block",
      reason: qualityResult.pass
        ? `SGO: 章节完成，质量门控通过\n${sessionSummary.report_text}`
        : `SGO: 章节完成，质量门控有 ${qualityResult.blockers.length} 个 BLOCKER`,
      hookSpecificOutput: {
        chapter_completed: true,
        summary_generated: qualityResult.pass || qualityResult.warnings_only,
        quality_gate_passed: qualityResult.pass,
        quality_gate_warnings: qualityResult.warnings.length,
        compression_needed: compressionNeeded,
        resume_context: qualityResult.pass ? generateResumeContext(stateFile) : null,
        quality_gate_result: {
          step1: qualityResult.step1,
          step2: qualityResult.step2,
          blockers: qualityResult.blockers,
          warnings: qualityResult.warnings
        },
        // NEW: Session summary for auto-report (D-03)
        session_summary: sessionSummary.data
      }
    };

    process.stdout.write(JSON.stringify(output));
    process.exit(qualityResult.pass ? 0 : 2);

  } catch (e) {
    // 解析错误时 fail-open（不影响正常使用）
    process.exit(0);
  }
});

// ====== Helper: Trigger quality-gate ======
async function triggerQualityGate(chapterFile, cwd) {
  return new Promise((resolve) => {
    const qualityGatePath = path.join(cwd, '.codex', 'sgo', 'hooks', 'quality-gate.js');

    if (!fs.existsSync(qualityGatePath)) {
      // Quality gate not available, skip
      resolve({ pass: true, warnings_only: true, blockers: [], warnings: [] });
      return;
    }

    const gate = spawn('node', [qualityGatePath, chapterFile], { cwd });

    let output = '';
    gate.stdout.on('data', (data) => { output += data.toString(); });
    gate.stderr.on('data', (data) => { console.error('quality-gate stderr:', data.toString()); });

    gate.on('close', (code) => {
      try {
        const result = JSON.parse(output);

        // Extract quality result
        const blockers = (result.final?.blockers || []).concat(
          (result.step1?.blockers || []),
          (result.step2?.blockers || [])
        );
        const warnings = (result.final?.warnings || []).concat(
          (result.step1?.warnings || []),
          (result.step2?.warnings || [])
        );

        resolve({
          pass: result.decision === "allow" && blockers.length === 0,
          warnings_only: result.decision === "allow" && blockers.length === 0 && warnings.length > 0,
          blockers,
          warnings,
          step1: result.step1 || {},
          step2: result.step2 || {},
          step3: result.step3 || {},   // QUAL-04: perspective check
          step4: result.step4 || {},   // QUAL-05: quality score
          promoted_to: result.promoted_to
        });
      } catch (e) {
        // Parse error, fail-open
        resolve({ pass: true, warnings_only: false, blockers: [], warnings: [] });
      }
    });

    gate.on('error', (e) => {
      console.error('quality-gate error:', e.message);
      resolve({ pass: true, warnings_only: false, blockers: [], warnings: [] });
    });
  });
}

// ====== Helper: Update Phase 13 long-term memory artifact ======
function updateLongTermMemory(cwd, chapterFile, chapterContent, qualityResult) {
  try {
    const memoryRelativePath = '.sgo/memory/long-term-memory.md';
    const memoryFile = path.join(cwd, memoryRelativePath);
    if (!fs.existsSync(memoryFile)) return;

    let memoryContent = fs.readFileSync(memoryFile, 'utf8');

    const chapterNumMatch = chapterContent.match(/chapter_number:\s*(\d+)/);
    const chapterId = chapterNumMatch ? `ch-${chapterNumMatch[1]}` : path.basename(chapterFile, '.md');

    const titleMatch = chapterContent.match(/^title:\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    const fsPlantedMatch = chapterContent.match(/foreshadow_planted:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
    const fsPlanted = fsPlantedMatch
      ? fsPlantedMatch[1].match(/-\s*(\S+)/g)?.map(m => m.replace(/^\-\s*/, '').trim()) || []
      : [];

    const fsCollectedMatch = chapterContent.match(/foreshadow_collected:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
    const fsCollected = fsCollectedMatch
      ? fsCollectedMatch[1].match(/-\s*(\S+)/g)?.map(m => m.replace(/^\-\s*/, '').trim()) || []
      : [];

    const storyFactEntry = `
  - chapter_id: "${chapterId}"
    title: "${title}"
    facts:
      - "foreshadow_planted:${fsPlanted.join(',') || 'none'}"
      - "foreshadow_collected:${fsCollected.join(',') || 'none'}"
    updated_at: "${new Date().toISOString()}"`;

    const preferenceSignals = [];
    if ((qualityResult.warnings || []).length > 0) {
      preferenceSignals.push(...qualityResult.warnings.map(w => w.type || 'warning'));
    }
    if ((qualityResult.blockers || []).length > 0) {
      preferenceSignals.push(...qualityResult.blockers.map(b => b.type || 'blocker'));
    }

    const preferenceEntry = `
  - chapter_id: "${chapterId}"
    signals: [${preferenceSignals.map(s => `"${s}"`).join(', ')}]
    updated_at: "${new Date().toISOString()}"`;

    memoryContent = replaceOrAppendYamlArray(memoryContent, 'story_facts_memory', storyFactEntry, chapterId);
    memoryContent = replaceOrAppendYamlArray(memoryContent, 'writing_preferences_memory', preferenceEntry, chapterId);
    memoryContent = memoryContent.replace(/last_chapter_synced:\s*.*/g, `last_chapter_synced: "${chapterId}"`);
    memoryContent = memoryContent.replace(/updated_at:\s*.*/g, `updated_at: "${new Date().toISOString()}"`);

    fs.writeFileSync(memoryFile, memoryContent);
  } catch (e) {
    console.error('Error updating long-term memory:', e.message);
  }
}

function replaceOrAppendYamlArray(content, fieldName, entry, chapterId) {
  const pattern = new RegExp(`(${fieldName}:\\s*\\n)([\\s\\S]*?)(?=\\n\\w|\\n---|$)`);
  const match = content.match(pattern);
  if (!match) return content;

  const existing = match[2];
  const entryPattern = new RegExp(`- chapter_id:\\s*"${chapterId}"[\\s\\S]*?(?=\\n\\s*- chapter_id:|$)`);
  let next = existing;
  if (entryPattern.test(existing)) {
    next = existing.replace(entryPattern, entry.trimStart());
  } else {
    next = existing + entry + '\n';
  }
  return content.replace(pattern, `$1${next}`);
}

// ====== Helper: Update STATE.md with chapter summary ======
function updateStateWithChapterSummary(stateFile, chapterFile, chapterContent, qualityResult) {
  try {
    if (!fs.existsSync(stateFile)) return;

    let stateContent = fs.readFileSync(stateFile, 'utf8');

    // 解析章节信息
    const chapterNumMatch = chapterContent.match(/chapter_number:\s*(\d+)/);
    const titleMatch = chapterContent.match(/^title:\s*(.+)$/m);
    const wordCountMatch = chapterContent.match(/word_count:\s*(\d+)/);

    const chapterId = chapterNumMatch ? `ch-${chapterNumMatch[1]}` : 'unknown';
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : 0;

    // 生成摘要（取前两段，150-300字）
    const contentMatch = chapterContent.match(/## 场景正文\n([\s\S]*?)(?=\n##|\n---|$)/);
    let summary = '';
    if (contentMatch) {
      const content = contentMatch[1].trim();
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
      summary = paragraphs.slice(0, 2).join('\n\n').substring(0, 300);
      if (summary.length > 0 && summary.length < 150) {
        // If too short, extend
        summary = paragraphs.slice(0, 3).join('\n\n').substring(0, 300);
      }
    }

    // 解析 foreshadow_planted/collected
    const fsPlantedMatch = chapterContent.match(/foreshadow_planted:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
    const fsPlanted = fsPlantedMatch
      ? fsPlantedMatch[1].match(/-\s*(\S+)/g)?.map(m => m.replace(/^\-\s*/, '').trim()) || []
      : [];

    const fsCollectedMatch = chapterContent.match(/foreshadow_collected:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
    const fsCollected = fsCollectedMatch
      ? fsCollectedMatch[1].match(/-\s*(\S+)/g)?.map(m => m.replace(/^\-\s*/, '').trim()) || []
      : [];

    // 创建章节摘要条目
    const chapterEntry = `
    - chapter_id: ${chapterId}
      title: "${title}"
      word_count: ${wordCount}
      summary: |
        ${summary.split('\n').join('\n        ')}
      foreshadow_planted: [${fsPlanted.map(f => `"${f}"`).join(', ')}]
      foreshadow_collected: [${fsCollected.map(f => `"${f}"`).join(', ')}]
      created_at: "${new Date().toISOString()}"
      quality_gate_passed: ${qualityResult.pass}`;

    // 查找或创建 completed_chapters 节
    if (stateContent.includes('completed_chapters:')) {
      // 追加到现有 completed_chapters
      stateContent = stateContent.replace(
        /(completed_chapters:\s*\n)([\s\S]*?)(?=\ncompression_snapshots:|\n---|\n#|\n\nwriting_progress:)/,
        (match, prefix, existing) => {
          // 检查是否已存在该章节
          if (existing.includes(`chapter_id: ${chapterId}`)) {
            return match; // 已存在，不重复添加
          }
          return prefix + existing + chapterEntry + '\n';
        }
      );
    } else {
      // 在 Writing Progress 部分后添加 completed_chapters
      stateContent = stateContent.replace(
        /(## Writing Progress\n)/,
        '$1completed_chapters:' + chapterEntry + '\n\n'
      );
    }

    // 更新 current_chapter
    const currentChapterMatch = chapterContent.match(/chapter_number:\s*(\d+)/);
    if (currentChapterMatch) {
      const nextChapter = parseInt(currentChapterMatch[1]) + 1;
      stateContent = stateContent.replace(
        /current_chapter:\s*\d+/,
        `current_chapter: ${nextChapter}`
      );
    }

    // 写入更新后的 STATE.md
    fs.writeFileSync(stateFile, stateContent);

  } catch (e) {
    console.error('Error updating STATE.md:', e.message);
    // Non-blocking - continue
  }
}

// ====== Helper: Check batch check trigger (D-02: aligned with compression frequency) ======
function checkBatchCheckTrigger(stateFile) {
  try {
    if (!fs.existsSync(stateFile)) return false;

    const stateContent = fs.readFileSync(stateFile, 'utf8');

    // 计算已完成章节数
    const completedMatch = stateContent.match(/completed_chapters:\s*\n([\s\S]*?)(?=\ncompression_snapshots:|\n---|\n#|\n\n|$)/);
    const completedCount = completedMatch
      ? (completedMatch[1].match(/chapter_id:/g) || []).length
      : 0;

    // 获取 BATCH_SIZE（默认5，长篇5章/短篇3章）
    const batchSizeMatch = stateContent.match(/BATCH_SIZE:\s*(\d+)/);
    const batchSize = batchSizeMatch ? parseInt(batchSizeMatch[1]) : 5;

    // 检查 batch_check_triggered 状态
    const triggeredMatch = stateContent.match(/batch_check_triggered:\s*(true|false)/);
    const alreadyTriggered = triggeredMatch && triggeredMatch[1] === 'true';

    // 如果已完成章节数达到批次大小且尚未触发，则触发批量检查
    const shouldTrigger = completedCount > 0 && completedCount % batchSize === 0 && !alreadyTriggered;

    // 更新 batch_check_triggered 状态
    if (shouldTrigger) {
      fs.writeFileSync(stateFile, stateContent.replace(
        /batch_check_triggered:\s*(true|false)/,
        'batch_check_triggered: true'
      ));
    }

    return shouldTrigger;

  } catch (e) {
    return false;
  }
}

// ====== Helper: Check compression trigger (D-05) ======
function checkCompressionTrigger(stateFile) {
  try {
    if (!fs.existsSync(stateFile)) return false;

    const stateContent = fs.readFileSync(stateFile, 'utf8');

    // 计算已完成章节数
    const completedMatch = stateContent.match(/completed_chapters:\s*\n([\s\S]*?)(?=\ncompression_snapshots:|\n---|\n#|\n\n|$)/);
    const completedCount = completedMatch
      ? (completedMatch[1].match(/chapter_id:/g) || []).length
      : 0;

    // 每5章触发一次压缩
    return completedCount > 0 && completedCount % 5 === 0;

  } catch (e) {
    return false;
  }
}

// ====== Helper: Persist batch quality results (D-03 key-link pattern) ======
function persistBatchResults(stateFile, batchResult) {
  try {
    if (!fs.existsSync(stateFile)) return;

    let stateContent = fs.readFileSync(stateFile, 'utf8');

    // 生成批次ID
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const seqNum = ((stateContent.match(/quality_batch_history:/g) || []).length + 1).toString().padStart(3, '0');
    const batchId = `batch-${timestamp}-${seqNum}`;

    // 解析章节范围
    const completedMatch = stateContent.match(/completed_chapters:\s*\n([\s\S]*?)(?=\ncompression_snapshots:|\n---|\n#|\n\n|$)/);
    const chapterCount = completedMatch
      ? (completedMatch[1].match(/chapter_id:/g) || []).length
      : 0;

    // 获取 BATCH_SIZE（默认5）
    const batchSizeMatch = stateContent.match(/BATCH_SIZE:\s*(\d+)/);
    const batchSize = batchSizeMatch ? parseInt(batchSizeMatch[1]) : 5;
    const startChapter = Math.max(1, chapterCount - batchSize + 1);
    const chapterRange = `${startChapter}-${chapterCount}`;

    // 构建批次记录
    const batchEntry = `
    - batch_id: "${batchId}"
      chapter_range: "${chapterRange}"
      quality_score: ${batchResult.total || 0}
      perspective_check:
        expected: "${batchResult.expected || 'unknown'}"
        actual: "${batchResult.actual || 'unknown'}"
        consistent: ${batchResult.consistent !== false}
      blockers: [${(batchResult.blockers || []).map(b => `"${b.type || 'unknown'}"`).join(', ')}]
      warnings: [${(batchResult.warnings || []).map(w => `"${w.type || 'unknown'}"`).join(', ')}]
      timestamp: "${new Date().toISOString()}"
      triggered_by: "batch_check"`;

    // 追加到 quality_batch_history
    if (stateContent.includes('quality_batch_history:')) {
      // 保留最近10条记录
      stateContent = stateContent.replace(
        /(quality_batch_history:\s*\n)([\s\S]*?)(?=\n\w|\n---|\n#|$)/,
        (match, prefix, existing) => {
          // 解析现有记录数量
          const existingEntries = existing.match(/- batch_id:/g) || [];
          if (existingEntries.length >= 10) {
            // 移除最旧的记录（第一个 - batch_id: 开头）
            const entries = existing.split('\n    - ');
            if (entries.length > 1) {
              // 保留除了第一条之外的所有记录
              const trimmedExisting = entries.slice(1).join('\n    - ');
              return prefix + '    - ' + trimmedExisting + batchEntry + '\n';
            }
          }
          return prefix + existing + batchEntry + '\n';
        }
      );
    } else {
      // 在质量概览部分后添加
      stateContent = stateContent.replace(
        /(## 质量概览\n)/,
        '$1quality_batch_history:' + batchEntry + '\n\n'
      );
    }

    // 更新 batch_check_triggered 为 false
    stateContent = stateContent.replace(
      /batch_check_triggered:\s*(true|false)/,
      'batch_check_triggered: false'
    );

    fs.writeFileSync(stateFile, stateContent);

  } catch (e) {
    console.error('Error persisting batch results:', e.message);
    // Non-blocking - continue
  }
}

// ====== Helper: Generate resume context ======
function generateResumeContext(stateFile) {
  try {
    if (!fs.existsSync(stateFile)) return null;

    const stateContent = fs.readFileSync(stateFile, 'utf8');

    // 提取已完成章节数
    const completedMatch = stateContent.match(/completed_chapters:\s*\n([\s\S]*?)(?=\ncompression_snapshots:|\n---|\n#|\n\n|$)/);
    const completedCount = completedMatch
      ? (completedMatch[1].match(/chapter_id:/g) || []).length
      : 0;

    // 获取最新章节的摘要
    const summaries = [];
    if (completedMatch) {
      const entries = completedMatch[1].matchAll(/chapter_id:\s*(\w+)\n\s+title:\s*"([^"]+)"/g);
      for (const match of entries) {
        summaries.push({ id: match[1], title: match[2] });
      }
    }

    return {
      total_completed: completedCount,
      recent_chapters: summaries.slice(-3),
      resume_point: summaries.length > 0 ? summaries[summaries.length - 1].id : null
    };

  } catch (e) {
    return null;
  }
}

// ====== Helper: Build session summary report (D-03) ======
function buildSessionSummary(filePath, stateFile, wordCount, chapterContent) {
  try {
    // Parse chapter info
    const chapterNumMatch = chapterContent.match(/chapter_number:\s*(\d+)/);
    const titleMatch = chapterContent.match(/^title:\s*(.+)$/m);
    const chapterId = chapterNumMatch ? `ch-${chapterNumMatch[1]}` : 'unknown';
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

    // Parse foreshadow changes
    const fsPlantedMatch = chapterContent.match(/foreshadow_planted:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
    const fsPlanted = fsPlantedMatch
      ? fsPlantedMatch[1].match(/-\s*(\S+)/g)?.map(m => m.replace(/^\-\s*/, '').trim()) || []
      : [];

    const fsCollectedMatch = chapterContent.match(/foreshadow_collected:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
    const fsCollected = fsCollectedMatch
      ? fsCollectedMatch[1].match(/-\s*(\S+)/g)?.map(m => m.replace(/^\-\s*/, '').trim()) || []
      : [];

    // Calculate total chapters from state
    let totalChapters = 0;
    if (fs.existsSync(stateFile)) {
      const stateContent = fs.readFileSync(stateFile, 'utf8');
      const completedMatch = stateContent.match(/completed_chapters:\s*\n([\s\S]*?)(?=\ncompression_snapshots:|\n---|\n#|\n\n|$)/);
      totalChapters = completedMatch
        ? (completedMatch[1].match(/chapter_id:/g) || []).length
        : 0;
    }

    // Predict next chapter
    const nextChapter = chapterNumMatch ? parseInt(chapterNumMatch[1]) + 1 : 2;

    // Build report text
    const reportText = `=== 本次写作会话汇总 ===\n完成章节: ${path.basename(filePath)} (${wordCount}字)\n本次产出: +${wordCount}字  伏笔铺设: ${fsPlanted.length}  伏笔回收: ${fsCollected.length}\n下一步: 继续写作 → ch-${nextChapter}`;

    return {
      data: {
        session_report: true,
        chapter_completed: path.basename(filePath),
        chapter_title: title,
        word_count_added: wordCount,
        total_chapters: totalChapters,
        foreshadow_planted: fsPlanted,
        foreshadow_collected: fsCollected,
        foreshadow_planted_count: fsPlanted.length,
        foreshadow_collected_count: fsCollected.length,
        next_step: `继续写作 → ch-${nextChapter}`
      },
      report_text: reportText
    };

  } catch (e) {
    return {
      data: {
        session_report: true,
        chapter_completed: path.basename(filePath),
        word_count_added: wordCount,
        error: e.message
      },
      report_text: `=== 本次写作会话汇总 ===\n完成章节: ${path.basename(filePath)} (${wordCount}字)\n本次产出: +${wordCount}字`
    };
  }
}
