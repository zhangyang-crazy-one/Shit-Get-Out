#!/usr/bin/env node
// SGO Hook: quality-gate.js
// Purpose: Five-step quality check for chapter completion
// Triggered by: writing-exit.js on chapter completion
// 5-Step Pattern: Self-review → Rule check → Perspective → Scoring → Escalation

const fs = require('fs');
const path = require('path');

// Parse command line args: quality-gate.js <chapter_file> [output_dir]
const chapterFile = process.argv[2];
const outputDir = process.argv[3] || '.sgo/chapters/';

if (!chapterFile) {
  console.error('Usage: quality-gate.js <chapter_file> [output_dir]');
  process.exit(1);
}

// Get working directory
const cwd = process.cwd();

// ====== STEP 1: Self-review (quick structural checks) ======
function selfReview(chapterContent, constitutionContent) {
  const blockers = [];
  const warnings = [];

  // 1.1: Word count check
  const wordCountMatch = chapterContent.match(/word_count:\s*(\d+)/);
  const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : 0;

  // Get target word count from constitution or type config
  let targetMin = 1500; // default minimum
  let targetMax = 3000; // default maximum

  if (constitutionContent) {
    const targetMatch = constitutionContent.match(/target_word_count:\s*["']?([^"'\n]+)["']?/);
    if (targetMatch) {
      const targetStr = targetMatch[1].trim();
      // Parse "2000-3000" format
      const rangeMatch = targetStr.match(/(\d+)-(\d+)/);
      if (rangeMatch) {
        targetMin = parseInt(rangeMatch[1]);
        targetMax = parseInt(rangeMatch[2]);
      } else {
        // Single number
        const num = parseInt(targetStr);
        if (!isNaN(num)) {
          targetMin = Math.floor(num * 0.8);
          targetMax = Math.floor(num * 1.2);
        }
      }
    }
  }

  if (wordCount < targetMin) {
    blockers.push({
      step: 1,
      type: "word_count_insufficient",
      issue: `字数不足: ${wordCount} < ${targetMin}`
    });
  }

  // 1.2: Frontmatter check
  const frontmatterRequired = ['chapter_number', 'title'];
  for (const field of frontmatterRequired) {
    if (!chapterContent.match(new RegExp(`^${field}:`))) {
      blockers.push({
        step: 1,
        type: "missing_frontmatter",
        issue: `缺少必填字段: ${field}`
      });
    }
  }

  // 1.3: Content section check
  if (!chapterContent.includes('## 场景正文') && !chapterContent.includes('## 正文') && !chapterContent.includes('## content', 'i')) {
    blockers.push({
      step: 1,
      type: "missing_content_section",
      issue: '缺少场景正文章节（## 场景正文）'
    });
  }

  // 1.4: Active characters check (warning only - not blocking)
  const activeCharsMatch = chapterContent.match(/active_characters:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
  if (!activeCharsMatch || activeCharsMatch[1].trim().length === 0) {
    warnings.push({
      step: 1,
      type: "no_active_characters",
      issue: '章节中未声明 active_characters'
    });
  }

  // 1.5: Foreshadow arrays initialized check
  const fsPlanted = chapterContent.match(/foreshadow_planted:\s*\n/);
  const fsCollected = chapterContent.match(/foreshadow_collected:\s*\n/);
  if (!fsPlanted || !fsCollected) {
    warnings.push({
      step: 1,
      type: "foreshadow_arrays_missing",
      issue: '章节中未初始化 foreshadow_planted/collected 数组'
    });
  }

  return {
    pass: blockers.length === 0,
    blockers,
    warnings,
    metadata: { wordCount, targetMin, targetMax }
  };
}

// ====== STEP 2: Rule check (sgo-validator pattern) ======
function ruleCheck(chapterContent, constitutionContent, outlineContent) {
  const blockers = [];
  const warnings = [];

  // 2.1: QUAL-01: Character consistency check
  if (outlineContent) {
    // Extract active characters from chapter
    const activeCharsMatch = chapterContent.match(/active_characters:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
    if (activeCharsMatch) {
      const activeChars = activeCharsMatch[1]
        .match(/\-\s*(\S+)/g)
        ?.map(m => m.replace(/^\-\s*/, '').trim()) || [];

      // Extract character definitions from outline
      const charsBlockMatch = outlineContent.match(/characters:\s*\n([\s\S]*?)(?=\n\w|\n#|$)/);
      if (charsBlockMatch) {
        for (const charName of activeChars) {
          // Check if character is defined in outline
          if (!charsBlockMatch[1].includes(`name: ${charName}`) &&
              !charsBlockMatch[1].includes(`name:\"${charName}\"`) &&
              !charsBlockMatch[1].includes(`name:'${charName}'`)) {
            warnings.push({
              step: 2,
              type: "QUAL-01",
              issue: `角色 "${charName}" 未在大纲中定义`
            });
          }
        }
      }
    }
  }

  // 2.2: QUAL-02: Worldview/iron rules consistency check
  if (constitutionContent) {
    const ironRulesMatch = constitutionContent.match(/## 铁律层\n([\s\S]*?)(?=\n##|\n#|$)/);
    if (ironRulesMatch && ironRulesMatch[1].length > 50) {
      const ironRules = ironRulesMatch[1];

      // Extract specific rules (simple pattern-based check)
      const ruleLines = ironRules.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
      for (const ruleLine of ruleLines) {
        const ruleText = ruleLine.replace(/^[\-\*]\s*/, '').trim();
        if (ruleText.length > 10) {
          // Check if chapter violates the rule
          // This is a simplified check - actual implementation would parse rule semantics
          const ruleKeywords = ruleText.split(/\s+/).filter(w => w.length > 3);
          for (const keyword of ruleKeywords.slice(0, 3)) {
            // Check for negation patterns like "禁止", "不允许", "不得"
            if (/禁止|不允许|不得|严禁/.test(ruleText)) {
              // Extract what's being forbidden
              const forbidMatch = ruleText.match(/(禁止|不允许|不得|严禁)\s*([^。，]+)/);
              if (forbidMatch && forbidMatch[2]) {
                const forbidden = forbidMatch[2].toLowerCase();
                const chapterLower = chapterContent.toLowerCase();
                // Simple keyword check - would need more sophisticated NLP for production
                if (forbidden.length > 2 && chapterLower.includes(forbidden)) {
                  blockers.push({
                    step: 2,
                    type: "QUAL-02",
                    issue: `章节内容可能违反铁律: "${forbidden}"`
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  // 2.3: QUAL-03: Foreshadow closure check
  if (outlineContent) {
    // Extract foreshadow plan from outline
    const foreshadowMatch = outlineContent.match(/foreshadow_plan:\s*\n([\s\S]*?)(?=\n\w|\n#|$)/);
    if (foreshadowMatch) {
      // Parse planted foreshadows from chapter
      const plantedMatch = chapterContent.match(/foreshadow_planted:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
      const plantedList = plantedMatch
        ? plantedMatch[1].match(/-\s*(\S+)/g)?.map(m => m.replace(/^\-\s*/, '').trim()) || []
        : [];

      // Parse collected foreshadows from chapter
      const collectedMatch = chapterContent.match(/foreshadow_collected:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
      const collectedList = collectedMatch
        ? collectedMatch[1].match(/-\s*(\S+)/g)?.map(m => m.replace(/^\-\s*/, '').trim()) || []
        : [];

      // Check if planted foreshadows have corresponding plan entries
      for (const fsId of plantedList) {
        if (!foreshadowMatch[1].includes(`id: ${fsId}`) && !foreshadowMatch[1].includes(`id:"${fsId}"`)) {
          warnings.push({
            step: 2,
            type: "QUAL-03",
            issue: `章节种植的伏笔 "${fsId}" 不在大纲伏笔计划中`
          });
        }
      }

      // Check if collected foreshadows were previously planted
      for (const fsId of collectedList) {
        // This would require tracking state - simplified warning
        if (!foreshadowMatch[1].includes(`id: ${fsId}`) && !foreshadowMatch[1].includes(`id:"${fsId}"`)) {
          warnings.push({
            step: 2,
            type: "QUAL-03",
            issue: `章节回收的伏笔 "${fsId}" 不在大纲伏笔计划中`
          });
        }
      }
    }
  }

  return { blockers, warnings };
}

// ====== STEP 3: Perspective Detection (QUAL-04) ======
// D-01: Perspective auto-detected from constitution
// D-03: Perspective violations are blocker severity

function perspectiveCheck(chapterContent, constitutionContent) {
  const violations = [];

  // 3.1: Determine expected perspective from constitution/type config
  const expectedPerspective = detectExpectedPerspective(constitutionContent);

  // 3.2: Analyze actual perspective in chapter (narration only, no dialogue)
  const narrationOnly = stripDialogue(chapterContent);
  const actualType = detectActualPerspective(narrationOnly);

  // 3.3: Compare and detect violations
  if (!perspectiveMatches(expectedPerspective, actualType)) {
    violations.push({
      step: 3,
      type: "QUAL-04",
      severity: "blocker", // D-03: Always blocker
      issue: `视角违规: 章节使用 ${actualType}，但预期 ${expectedPerspective}`,
      expected: expectedPerspective,
      actual: actualType
    });
  }

  // 3.4: Check for mixed perspective within chapter (more than 2 switches)
  const mixedSignals = detectMixedPerspective(narrationOnly);
  if (mixedSignals.length > 2) {
    violations.push({
      step: 3,
      type: "QUAL-04",
      severity: "blocker",
      issue: `章节中出现 ${mixedSignals.length} 个视角切换信号`,
      signals: mixedSignals
    });
  }

  return {
    violations,
    expected: expectedPerspective,
    actual: actualType,
    consistent: violations.length === 0
  };
}

function stripDialogue(content) {
  // Remove Chinese and English quotes to avoid dialogue false positives
  return content
    .replace(/"[^"]*"/g, '')      // English double quotes
    .replace(/「[^」]*」/g, '')   // Chinese angle quotes
    .replace(/『[^』]*』/g, '')   // Chinese corner quotes
    .replace(/‘[^’]*’/g, '')     // English single quotes
    .replace(/"/g, '');
}

function detectExpectedPerspective(constitutionContent) {
  // Check type config for pov_default
  const povMatch = constitutionContent.match(/pov_default:\s*(.+)/i);
  if (povMatch) {
    const pov = povMatch[1].trim().toLowerCase();
    if (pov.includes('first') || pov.includes('第一人称')) return 'first_person';
    if (pov.includes('全知')) return 'third_person_omniscient';
    if (pov.includes('限知') || pov.includes('限制')) return 'third_person_limited';
    if (pov.includes('双视角')) return 'dual_pov';
  }

  // Fallback: check constitution for first-person markers
  if (constitutionContent.includes('第一人称')) return 'first_person';
  if (constitutionContent.includes('全知')) return 'third_person_omniscient';
  if (constitutionContent.includes('限知')) return 'third_person_limited';

  return 'third_person_limited'; // Default assumption
}

function detectActualPerspective(narrationContent) {
  // Count first-person pronouns (excluding dialogue, already stripped)
  const firstPersonCount = (narrationContent.match(/我|我的|我自己/g) || []).length;
  const thirdPersonCount = (narrationContent.match(/他|她|它|他的|她的|它的/g) || []).length;

  // Heuristic: first-person if ratio > 0.1 and absolute count > 5
  if (firstPersonCount > 5 && firstPersonCount / (firstPersonCount + thirdPersonCount) > 0.1) {
    return 'first_person';
  }

  // Check for internal thought markers (third-person limited)
  const internalMarkers = (narrationContent.match(/心想|想着|感到|觉得|内心|暗自|想到/g) || []).length;
  if (internalMarkers > 3) {
    return 'third_person_limited';
  }

  return 'third_person_omniscient'; // No strong signals either way
}

function perspectiveMatches(expected, actual) {
  if (expected === 'dual_pov') return true; // Dual POV can switch
  if (expected === 'third_person_omniscient') {
    return actual === 'third_person_omniscient' || actual === 'third_person_limited';
  }
  return expected === actual;
}

function detectMixedPerspective(narrationContent) {
  const signals = [];
  const lines = narrationContent.split('\n');

  let lastPerspective = null;
  for (const line of lines) {
    const firstPersonCount = (line.match(/我|我的|我自己/g) || []).length;
    const thirdPersonCount = (line.match(/他|她|它的|他的|她的/g) || []).length;

    let currentPerspective = null;
    if (firstPersonCount > thirdPersonCount && firstPersonCount > 2) {
      currentPerspective = 'first_person';
    } else if (thirdPersonCount > firstPersonCount && thirdPersonCount > 2) {
      currentPerspective = 'third_person';
    }

    if (currentPerspective && lastPerspective && currentPerspective !== lastPerspective) {
      signals.push({ line: line.trim().substring(0, 50), from: lastPerspective, to: currentPerspective });
    }
    if (currentPerspective) lastPerspective = currentPerspective;
  }

  return signals;
}

// ====== STEP 4: Quality Scoring (QUAL-05) ======
// D-04: Focus on narrative quality (coherence, pacing, tension)
// D-05: 70-point threshold triggers revision
// D-06: Real-time display via hookSpecificOutput

function qualityScore(chapterContent, constitutionContent, typeConfig) {
  // Load type-specific weights (default if not found)
  const weights = typeConfig?.quality_rules?.scoring_weights || {
    narrative: 0.4,
    character: 0.3,
    style: 0.3
  };

  // Calculate sub-dimensions (D-04: focus on narrative quality)
  const narrativeScore = calculateNarrativeScore(chapterContent);

  // Character and style are placeholder scores (QUAL-01/02 handle these)
  const characterScore = 75; // Default, actual check done by QUAL-01
  const styleScore = 75;     // Default, actual check done by style-anchoring

  // Weighted total
  const total = Math.round(
    narrativeScore.total * weights.narrative +
    characterScore * weights.character +
    styleScore * weights.style
  );

  return {
    dimensions: {
      narrative: {
        coherence: narrativeScore.coherence,
        pacing: narrativeScore.pacing,
        tension: narrativeScore.tension,
        sub_total: Math.round(narrativeScore.total)
      },
      character: characterScore,
      style: styleScore
    },
    total,
    threshold_70_passed: total >= 70, // D-05: 70-point threshold
    weights_applied: weights,
    real_time_display: {
      score_bar: generateScoreBar(total),
      breakdown: `${Math.round(narrativeScore.total)}/${characterScore}/${styleScore}`,
      pass_status: total >= 70 ? "PASS" : "REVISION_NEEDED"
    }
  };
}

function calculateNarrativeScore(content) {
  // D-04: Focus on narrative quality dimensions
  const coherence = scoreCoherence(content);
  const pacing = scorePacing(content);
  const tension = scoreTension(content);

  return {
    coherence,
    pacing,
    tension,
    total: (coherence + pacing + tension) / 3
  };
}

function scoreCoherence(content) {
  // Scene transition markers
  const transitions = (content.match(/于是|接着|然后|之后|与此同时|然而|但是/g) || []).length;
  const paragraphs = content.split(/\n\n+/).length;
  const transitionRatio = transitions / Math.max(paragraphs, 1);

  // Scene logic markers (cause-effect)
  const causeEffect = (content.match(/因为|所以|导致|于是|因此/g) || []).length;
  const causeEffectRatio = causeEffect / Math.max(paragraphs, 1);

  // Score: 0-100, balanced transition ratio + cause-effect logic
  let score = 50;
  if (transitionRatio >= 0.1 && transitionRatio <= 0.4) score += 25;
  if (causeEffectRatio >= 0.05) score += 25;

  return Math.min(100, Math.max(0, score));
}

function scorePacing(content) {
  // Sentence length variation (too uniform = boring)
  const sentences = content.match(/[。！？]+/g) || [];
  const avgLength = content.length / Math.max(sentences.length, 1);

  // Variation coefficient
  const lengths = content.split(/[。！？]+/).map(s => s.trim().length);
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / Math.max(lengths.length, 1);
  const variationScore = Math.min(100, Math.sqrt(variance) * 2);

  // Dialogue ratio (high dialogue = faster pacing)
  const paragraphs = content.split(/\n\n+/).length;
  const dialogueRatio = (content.match(/"[^"]*"/g) || []).length / Math.max(paragraphs, 1);
  const dialogueScore = Math.min(100, dialogueRatio * 200);

  return Math.round((variationScore + dialogueScore) / 2);
}

function scoreTension(content) {
  // Conflict markers
  const conflictTerms = (content.match(/冲突|对峙|争吵|对抗|僵持|质问/g) || []).length;
  const questionMarkers = (content.match(/为什么|怎么办|如何|究竟/g) || []).length;

  // Cliff-hanger endings
  const cliffHangers = (content.match(/却不知道|不得而知|悬念|未完待续/g) || []).length;

  // Mystery/uncertainty markers
  const mysteryMarkers = (content.match(/似乎|好像|也许|可能|不知道/g) || []).length;

  let score = 30; // Base score
  score += Math.min(25, conflictTerms * 5);
  score += Math.min(20, questionMarkers * 4);
  score += Math.min(15, cliffHangers * 5);
  score += Math.min(10, mysteryMarkers);

  return Math.min(100, score);
}

function generateScoreBar(score) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return `[${'#'.repeat(filled)}${' '.repeat(empty)}] ${score}/100`;
}

// ====== STEP 5: Escalation (extended for QUAL-04/05) ======
function escalate(step1Result, step2Result, step3Result, step4Result) {
  const decision = {
    pass: false,
    blockers: [],
    warnings: [],
    action: null
  };

  // If STEP1 blockers: block and require revision
  if (step1Result.blockers.length > 0) {
    decision.blockers = decision.blockers.concat(step1Result.blockers);
  }

  // If STEP2 blockers: block and require revision
  if (step2Result.blockers.length > 0) {
    decision.blockers = decision.blockers.concat(step2Result.blockers);
  }

  // STEP3 perspective blockers (D-03: always blocker)
  for (const violation of step3Result.violations || []) {
    decision.blockers.push(violation);
  }

  // STEP4 quality score warning (D-05: below threshold is warning, not blocker)
  if (step4Result.total < 70) {
    decision.warnings.push({
      step: 4,
      type: "QUAL-05",
      severity: "warning",
      issue: `叙事质量评分 ${step4Result.total} < 70 分阈值，建议修订`
    });
  }

  // Warnings from all steps
  decision.warnings = decision.warnings
    .concat(step1Result.warnings || [])
    .concat(step2Result.warnings || []);

  // Determine action
  if (decision.blockers.length > 0) {
    decision.pass = false;
    decision.action = 'revision';
  } else if (decision.warnings.length > 0) {
    decision.pass = true;
    decision.action = 'proceed_with_warning';
  } else {
    decision.pass = true;
    decision.action = 'promote';
  }

  return decision;
}

// ====== Main execution ======
async function main() {
  try {
    // Read chapter content
    if (!fs.existsSync(chapterFile)) {
      const output = {
        decision: "block",
        reason: `Quality Gate: Chapter file not found: ${chapterFile}`,
        blockers: [{ step: 0, type: "file_not_found", issue: `文件不存在: ${chapterFile}` }]
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(2);
    }

    const chapterContent = fs.readFileSync(chapterFile, 'utf8');

    // Read constitution for word count targets and iron rules
    const constFile = path.join(cwd, '.sgo', 'constitution', 'constitution.md');
    const constitutionContent = fs.existsSync(constFile) ? fs.readFileSync(constFile, 'utf8') : '';

    // Read outline for character definitions and foreshadow plan
    const outlineFile = path.join(cwd, '.sgo', 'outline', 'outline.md');
    const outlineContent = fs.existsSync(outlineFile) ? fs.readFileSync(outlineFile, 'utf8') : '';

    // Read type config for scoring weights
    const typeConfigFile = path.join(cwd, '.sgo', 'type-config.md');
    let typeConfig = { quality_rules: { scoring_weights: null } };
    try {
      const typeConfigContent = fs.existsSync(typeConfigFile) ? fs.readFileSync(typeConfigFile, 'utf8') : '';
      // Try to extract quality_rules from type config
      const qualityRulesMatch = typeConfigContent.match(/quality_rules:\s*\n([\s\S]*?)(?=\n\w|\n---|$)/);
      if (qualityRulesMatch) {
        const weightsMatch = qualityRulesMatch[1].match(/scoring_weights:\s*\n([\s\S]*?)(?=\n\w|\n---|$)/);
        if (weightsMatch) {
          typeConfig.quality_rules.scoring_weights = {
            narrative: parseFloat(weightsMatch[1].match(/narrative:\s*([\d.]+)/)?.[1] || '0.4'),
            character: parseFloat(weightsMatch[1].match(/character:\s*([\d.]+)/)?.[1] || '0.3'),
            style: parseFloat(weightsMatch[1].match(/style:\s*([\d.]+)/)?.[1] || '0.3')
          };
        }
      }
    } catch (e) {
      // Use defaults
    }

    // STEP 1: Self-review
    const step1 = selfReview(chapterContent, constitutionContent);

    // STEP 2: Rule check
    const step2 = ruleCheck(chapterContent, constitutionContent, outlineContent);

    // STEP 3: Perspective check (QUAL-04)
    const step3 = perspectiveCheck(chapterContent, constitutionContent);

    // STEP 4: Quality scoring (QUAL-05)
    const step4 = qualityScore(chapterContent, constitutionContent, typeConfig);

    // STEP 5: Escalation
    const decision = escalate(step1, step2, step3, step4);

    // Prepare output
    const result = {
      decision: decision.pass ? "allow" : "block",
      reason: decision.action === 'promote'
        ? 'Quality Gate: All checks passed - chapter promoted to finalized'
        : decision.action === 'proceed_with_warning'
          ? `Quality Gate: Passed with ${decision.warnings.length} warnings`
          : `Quality Gate: ${decision.blockers.length} blockers found`,
      step1: {
        pass: step1.pass,
        blockers: step1.blockers,
        warnings: step1.warnings,
        metadata: step1.metadata
      },
      step2: {
        blockers: step2.blockers,
        warnings: step2.warnings
      },
      step3: {
        violations: step3.violations,
        expected: step3.expected,
        actual: step3.actual,
        consistent: step3.consistent
      },
      step4: {
        dimensions: step4.dimensions,
        total: step4.total,
        threshold_70_passed: step4.threshold_70_passed,
        real_time_display: step4.real_time_display
      },
      final: {
        pass: decision.pass,
        action: decision.action,
        blockers: decision.blockers,
        warnings: decision.warnings
      }
    };

    // If promote: move file to chapters directory
    if (decision.action === 'promote') {
      const outputDirPath = path.join(cwd, outputDir);
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }

      const fileName = path.basename(chapterFile);
      const destPath = path.join(outputDirPath, fileName);

      // Copy to chapters directory
      fs.copyFileSync(chapterFile, destPath);

      // Update frontmatter status if it exists
      let updatedContent = chapterContent;
      if (updatedContent.match(/^status:/m)) {
        updatedContent = updatedContent.replace(/^status:.*$/m, 'status: finalized');
        fs.writeFileSync(destPath, updatedContent);
      }

      result.promoted_to = destPath;
    }

    // Output result
    console.log(JSON.stringify(result, null, 2));

    // Exit code: 0 for pass, 2 for block
    process.exit(decision.pass ? 0 : 2);

  } catch (e) {
    // On error: fail-open but log
    const output = {
      decision: "allow",
      reason: `Quality Gate: Error during check (fail-open) - ${e.message}`,
      warnings: [{ step: 0, type: "internal_error", issue: e.message }]
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(0); // Fail-open
  }
}

main();
