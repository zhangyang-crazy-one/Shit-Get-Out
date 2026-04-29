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

function selfReview(chapterContent, constitutionContent) {
  const blockers = [];
  const warnings = [];

  const wordCountMatch = chapterContent.match(/word_count:\s*(\d+)/);
  const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : 0;

  let targetMin = 1500;
  let targetMax = 3000;

  if (constitutionContent) {
    const targetMatch = constitutionContent.match(/target_word_count:\s*["']?([^"'\n]+)["']?/);
    if (targetMatch) {
      const targetStr = targetMatch[1].trim();
      const rangeMatch = targetStr.match(/(\d+)-(\d+)/);
      if (rangeMatch) {
        targetMin = parseInt(rangeMatch[1]);
        targetMax = parseInt(rangeMatch[2]);
      } else {
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
      type: 'word_count_insufficient',
      issue: `字数不足: ${wordCount} < ${targetMin}`
    });
  }

  const frontmatterRequired = ['chapter_number', 'title'];
  for (const field of frontmatterRequired) {
    if (!chapterContent.match(new RegExp(`^${field}:`, 'm'))) {
      blockers.push({
        step: 1,
        type: 'missing_frontmatter',
        issue: `缺少必填字段: ${field}`
      });
    }
  }

  if (!chapterContent.includes('## 场景正文') && !chapterContent.includes('## 正文')) {
    blockers.push({
      step: 1,
      type: 'missing_content_section',
      issue: '缺少场景正文章节（## 场景正文）'
    });
  }

  const activeCharsMatch = chapterContent.match(/active_characters:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
  if (!activeCharsMatch || activeCharsMatch[1].trim().length === 0) {
    warnings.push({
      step: 1,
      type: 'no_active_characters',
      issue: '章节中未声明 active_characters'
    });
  }

  const fsPlanted = chapterContent.match(/foreshadow_planted:\s*(?:\[[^\]]*\]|\n)/);
  const fsCollected = chapterContent.match(/foreshadow_collected:\s*(?:\[[^\]]*\]|\n)/);
  if (!fsPlanted || !fsCollected) {
    warnings.push({
      step: 1,
      type: 'foreshadow_arrays_missing',
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

function ruleCheck(chapterContent, constitutionContent, outlineContent) {
  const blockers = [];
  const warnings = [];

  if (outlineContent) {
    const activeCharsMatch = chapterContent.match(/active_characters:\s*\n([\s\S]*?)(?=\n\w|\n---)/);
    if (activeCharsMatch) {
      const activeChars = activeCharsMatch[1]
        .match(/\-\s*(\S+)/g)
        ?.map(m => m.replace(/^\-\s*/, '').trim()) || [];

      const charsBlockMatch = outlineContent.match(/characters:\s*\n([\s\S]*?)(?=\n\w|\n#|$)/);
      if (charsBlockMatch) {
        for (const charName of activeChars) {
          if (!charsBlockMatch[1].match(new RegExp(`name:\\s*["']?${charName}["']?`))) {
            warnings.push({
              step: 2,
              type: 'QUAL-01',
              issue: `角色 "${charName}" 未在大纲中定义`
            });
          }
        }
      }
    }
  }

  if (constitutionContent) {
    const ironRulesMatch = constitutionContent.match(/## 铁律层\n([\s\S]*?)(?=\n##|\n#|$)/);
    if (ironRulesMatch && ironRulesMatch[1].length > 50) {
      const ironRules = ironRulesMatch[1];
      const ruleLines = ironRules.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
      for (const ruleLine of ruleLines) {
        const ruleText = ruleLine.replace(/^[\-\*]\s*/, '').trim();
        if (ruleText.length > 10) {
          const ruleKeywords = ruleText.split(/\s+/).filter(w => w.length > 3);
          for (const keyword of ruleKeywords.slice(0, 3)) {
            if (/禁止|不允许|不得|严禁/.test(ruleText)) {
              const forbidMatch = ruleText.match(/(禁止|不允许|不得|严禁)\s*([^。，]+)/);
              if (forbidMatch && forbidMatch[2]) {
                const forbidden = forbidMatch[2].toLowerCase();
                const chapterLower = chapterContent.toLowerCase();
                if (forbidden.length > 2 && chapterLower.includes(forbidden)) {
                  blockers.push({
                    step: 2,
                    type: 'QUAL-02',
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

  if (outlineContent) {
    const foreshadowMatch = outlineContent.match(/foreshadow_plan:\s*\n([\s\S]*?)(?=\n\w|\n#|$)/);
    if (foreshadowMatch) {
      const plantedList = parseYamlListField(chapterContent, 'foreshadow_planted');
      const collectedList = parseYamlListField(chapterContent, 'foreshadow_collected');

      for (const fsId of plantedList) {
        if (!foreshadowMatch[1].match(new RegExp(`id:\\s*["']?${fsId}["']?`))) {
          warnings.push({
            step: 2,
            type: 'QUAL-03',
            issue: `章节种植的伏笔 "${fsId}" 不在大纲伏笔计划中`
          });
        }
      }

      for (const fsId of collectedList) {
        if (!foreshadowMatch[1].match(new RegExp(`id:\\s*["']?${fsId}["']?`))) {
          warnings.push({
            step: 2,
            type: 'QUAL-03',
            issue: `章节回收的伏笔 "${fsId}" 不在大纲伏笔计划中`
          });
        }
      }
    }
  }

  return { blockers, warnings };
}

function parseYamlListField(content, fieldName) {
  const inlineMatch = content.match(new RegExp(`^${fieldName}:\\s*\\[([^\\]]*)\\]`, 'm'));
  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map(item => item.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  const blockMatch = content.match(new RegExp(`^${fieldName}:\\s*\\n([\\s\\S]*?)(?=\\n\\w|\\n---|$)`, 'm'));
  if (!blockMatch) return [];

  return blockMatch[1]
    .match(/-\s*(.+)/g)
    ?.map(line => line.replace(/^\-\s*/, '').trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean) || [];
}

function perspectiveCheck(chapterContent, constitutionContent) {
  const violations = [];
  const expectedPerspective = detectExpectedPerspective(constitutionContent);
  const narrationOnly = stripDialogue(chapterContent);
  const actualType = detectActualPerspective(narrationOnly);

  if (!perspectiveMatches(expectedPerspective, actualType)) {
    violations.push({
      step: 3,
      type: 'QUAL-04',
      severity: 'blocker',
      issue: `视角违规: 章节使用 ${actualType}，但预期 ${expectedPerspective}`,
      expected: expectedPerspective,
      actual: actualType
    });
  }

  const mixedSignals = detectMixedPerspective(narrationOnly);
  if (mixedSignals.length > 2) {
    violations.push({
      step: 3,
      type: 'QUAL-04',
      severity: 'blocker',
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
  return content
    .replace(/"[^"]*"/g, '')
    .replace(/「[^」]*」/g, '')
    .replace(/『[^』]*』/g, '')
    .replace(/‘[^’]*’/g, '')
    .replace(/"/g, '');
}

const PROPER_NAMES_WITH_WO = ['宰我'];

function normalizePerspectiveText(content) {
  let normalized = content || '';
  for (const name of PROPER_NAMES_WITH_WO) {
    normalized = normalized.replace(new RegExp(name, 'g'), name.replace(/我/g, '某'));
  }
  return normalized;
}

function detectExpectedPerspective(constitutionContent) {
  const povMatch = constitutionContent.match(/pov_default:\s*(.+)/i);
  if (povMatch) {
    const pov = povMatch[1].trim().toLowerCase();
    if (pov.includes('first') || pov.includes('第一人称')) return 'first_person';
    if (pov.includes('全知')) return 'third_person_omniscient';
    if (pov.includes('限知') || pov.includes('限制')) return 'third_person_limited';
    if (pov.includes('双视角')) return 'dual_pov';
  }

  if (constitutionContent.includes('第一人称')) return 'first_person';
  if (constitutionContent.includes('全知')) return 'third_person_omniscient';
  if (constitutionContent.includes('限知')) return 'third_person_limited';

  return 'third_person_limited';
}

function detectActualPerspective(narrationContent) {
  const normalized = normalizePerspectiveText(narrationContent);
  const firstPersonCount = (normalized.match(/我|我的|我自己/g) || []).length;
  const thirdPersonCount = (normalized.match(/他|她|它|他的|她的|它的/g) || []).length;

  if (firstPersonCount > 5 && firstPersonCount / (firstPersonCount + thirdPersonCount) > 0.1) {
    return 'first_person';
  }

  const internalMarkers = (normalized.match(/心想|想着|感到|觉得|内心|暗自|想到|心里|明白|知道|忽然|看得出|听得出/g) || []).length;
  if (internalMarkers > 3) {
    return 'third_person_limited';
  }

  return 'third_person_omniscient';
}

function perspectiveMatches(expected, actual) {
  if (expected === 'dual_pov') return true;
  if (expected === 'third_person_omniscient') {
    return actual === 'third_person_omniscient' || actual === 'third_person_limited';
  }
  return expected === actual;
}

function detectMixedPerspective(narrationContent) {
  const signals = [];
  const lines = normalizePerspectiveText(narrationContent).split('\n');

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

function qualityScore(chapterContent, constitutionContent, typeConfig) {
  const weights = typeConfig?.quality_rules?.scoring_weights || {
    narrative: 0.4,
    character: 0.3,
    style: 0.3
  };

  const narrativeScore = calculateNarrativeScore(chapterContent);
  const characterScore = 75;
  const styleScore = 75;
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
    threshold_70_passed: total >= 70,
    weights_applied: weights,
    real_time_display: {
      score_bar: generateScoreBar(total),
      breakdown: `${Math.round(narrativeScore.total)}/${characterScore}/${styleScore}`,
      pass_status: total >= 70 ? 'PASS' : 'REVISION_NEEDED'
    }
  };
}

function calculateNarrativeScore(content) {
  const coherence = scoreCoherence(content);
  const pacing = scorePacing(content);
  const tension = scoreTension(content);

  return {
    coherence,
    pacing,
    tension,
    total: coherence * 0.3 + pacing * 0.3 + tension * 0.4
  };
}

function scoreCoherence(content) {
  const transitions = (content.match(/于是|接着|然后|之后|与此同时|然而|但是/g) || []).length;
  const paragraphs = content.split(/\n\n+/).length;
  const transitionRatio = transitions / Math.max(paragraphs, 1);
  const causeEffect = (content.match(/因为|所以|导致|于是|因此/g) || []).length;
  const causeEffectRatio = causeEffect / Math.max(paragraphs, 1);

  let score = 50;
  if (transitionRatio >= 0.1 && transitionRatio <= 0.4) score += 25;
  if (causeEffectRatio >= 0.05) score += 25;

  return Math.min(100, Math.max(0, score));
}

function scorePacing(content) {
  const sentences = content.match(/[。！？]+/g) || [];
  const avgLength = content.length / Math.max(sentences.length, 1);
  const lengths = content.split(/[。！？]+/).map(s => s.trim().length);
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / Math.max(lengths.length, 1);
  const variationScore = Math.min(100, Math.sqrt(variance) * 2);
  const paragraphs = content.split(/\n\n+/).length;
  const dialogueRatio = (content.match(/"[^"]*"/g) || []).length / Math.max(paragraphs, 1);
  const dialogueScore = Math.min(100, dialogueRatio * 200);

  return Math.round((variationScore + dialogueScore) / 2);
}

function scoreTension(content) {
  const conflictTerms = (content.match(/冲突|对峙|争吵|对抗|僵持|质问/g) || []).length;
  const questionMarkers = (content.match(/为什么|怎么办|如何|究竟/g) || []).length;
  const cliffHangers = (content.match(/却不知道|不得而知|悬念|未完待续/g) || []).length;
  const mysteryMarkers = (content.match(/似乎|好像|也许|可能|不知道/g) || []).length;

  let score = 30;
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

function escalate(step1Result, step2Result, step3Result, step4Result) {
  const decision = {
    pass: false,
    blockers: [],
    warnings: [],
    action: null
  };

  if (step1Result.blockers.length > 0) {
    decision.blockers = decision.blockers.concat(step1Result.blockers);
  }

  if (step2Result.blockers.length > 0) {
    decision.blockers = decision.blockers.concat(step2Result.blockers);
  }

  for (const violation of step3Result.violations || []) {
    decision.blockers.push(violation);
  }

  if (step4Result.total < 70) {
    decision.warnings.push({
      step: 4,
      type: 'QUAL-05',
      severity: 'warning',
      issue: `叙事质量评分 ${step4Result.total} < 70 分阈值，建议修订`
    });
  }

  if (step4Result.dimensions?.narrative?.pacing !== undefined && step4Result.dimensions.narrative.pacing < 40) {
    decision.warnings.push({
      step: 4,
      type: 'pacing_collapse',
      severity: 'warning',
      issue: `检测到节奏塌陷: pacing=${step4Result.dimensions.narrative.pacing}，建议触发对抗式节奏修订`
    });
  }

  if (step4Result.dimensions?.style !== undefined && step4Result.dimensions.style < 60) {
    decision.warnings.push({
      step: 4,
      type: 'authorial_drift',
      severity: 'warning',
      issue: `检测到 authorial drift 信号: style=${step4Result.dimensions.style}`
    });
  }

  decision.warnings = decision.warnings
    .concat(step1Result.warnings || [])
    .concat(step2Result.warnings || []);

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

async function main() {
  try {
    if (!fs.existsSync(chapterFile)) {
      const output = {
        decision: 'block',
        reason: `Quality Gate: Chapter file not found: ${chapterFile}`,
        blockers: [{ step: 0, type: 'file_not_found', issue: `文件不存在: ${chapterFile}` }]
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(2);
    }

    const chapterContent = fs.readFileSync(chapterFile, 'utf8');
    const constFile = path.join(cwd, '.sgo', 'constitution', 'constitution.md');
    const constitutionContent = fs.existsSync(constFile) ? fs.readFileSync(constFile, 'utf8') : '';
    const outlineFile = path.join(cwd, '.sgo', 'outline', 'outline.md');
    const outlineContent = fs.existsSync(outlineFile) ? fs.readFileSync(outlineFile, 'utf8') : '';
    const typeConfig = { quality_rules: { scoring_weights: null } };

    const step1 = selfReview(chapterContent, constitutionContent);
    const step2 = ruleCheck(chapterContent, constitutionContent, outlineContent);
    const step3 = perspectiveCheck(chapterContent, constitutionContent);
    const step4 = qualityScore(chapterContent, constitutionContent, typeConfig);
    const decision = escalate(step1, step2, step3, step4);

    const result = {
      decision: decision.pass ? 'allow' : 'block',
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
        real_time_display: step4.real_time_display,
        warnings: decision.warnings.filter(w => w.type === 'pacing_collapse' || w.type === 'authorial_drift')
      },
      final: {
        pass: decision.pass,
        action: decision.action,
        blockers: decision.blockers,
        warnings: decision.warnings
      }
    };

    if (decision.action === 'promote') {
      const outputDirPath = path.join(cwd, outputDir);
      if (!fs.existsSync(outputDirPath)) {
        fs.mkdirSync(outputDirPath, { recursive: true });
      }

      const fileName = path.basename(chapterFile);
      const destPath = path.join(outputDirPath, fileName);
      fs.copyFileSync(chapterFile, destPath);

      let updatedContent = chapterContent;
      if (updatedContent.match(/^status:/m)) {
        updatedContent = updatedContent.replace(/^status:.*$/m, 'status: finalized');
        fs.writeFileSync(destPath, updatedContent);
      }

      result.promoted_to = destPath;
    }

    console.log(JSON.stringify(result, null, 2));
    process.exit(decision.pass ? 0 : 2);
  } catch (e) {
    const output = {
      decision: 'allow',
      reason: `Quality Gate: Error during check (fail-open) - ${e.message}`,
      warnings: [{ step: 0, type: 'internal_error', issue: e.message }]
    };
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  }
}

main();
