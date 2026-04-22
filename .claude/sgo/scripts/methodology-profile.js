#!/usr/bin/env node
// SGO Methodology Profile resolver
// Resolves global defaults + genre override into .sgo/methodology/profile.resolved.json

const fs = require('fs');
const path = require('path');

const RUNTIME_ROOT = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(RUNTIME_ROOT, 'config');
const DEFAULTS_FILE = path.join(CONFIG_DIR, 'methodology-defaults.json');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function safeRead(filePath) {
  return fileExists(filePath) ? readText(filePath) : '';
}

function parseArgs(argv) {
  const result = {
    command: 'resolve',
    genre: '',
    projectRoot: process.cwd(),
    write: true,
    jsonOnly: false,
  };

  const tokens = [...argv];
  if (tokens[0] && !tokens[0].startsWith('--')) {
    result.command = tokens.shift();
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === '--genre') {
      result.genre = tokens[i + 1] || '';
      i += 1;
    } else if (token === '--project-root') {
      result.projectRoot = path.resolve(tokens[i + 1] || process.cwd());
      i += 1;
    } else if (token === '--no-write') {
      result.write = false;
    } else if (token === '--json') {
      result.jsonOnly = true;
    }
  }

  return result;
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

function extractScalar(frontmatter, key) {
  const pattern = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n#]+))`, 'm');
  const match = frontmatter.match(pattern);
  if (!match) return '';
  return (match[1] || match[2] || match[3] || '').trim();
}

function loadConfigMeta(configPath) {
  const content = readText(configPath);
  const frontmatter = extractFrontmatter(content);
  return {
    path: configPath,
    slug: extractScalar(frontmatter, 'slug'),
    display_name: extractScalar(frontmatter, 'display_name'),
    methodology_profile_ref: extractScalar(frontmatter, 'methodology_profile_ref'),
  };
}

function listTypeConfigs() {
  return fs
    .readdirSync(CONFIG_DIR)
    .filter(name => name.endsWith('.md'))
    .map(name => path.join(CONFIG_DIR, name));
}

function buildDisplayNameMap() {
  const mapping = new Map();
  for (const configPath of listTypeConfigs()) {
    const meta = loadConfigMeta(configPath);
    if (meta.display_name && meta.slug) {
      mapping.set(meta.display_name, meta.slug);
    }
  }
  return mapping;
}

function parseGenreConfigRef(content) {
  const match = content.match(/genre_config_ref:\s*"([^"]+)"/);
  if (!match) return '';
  const ref = match[1];
  const slugMatch = ref.match(/\/([^/]+)\.md$/);
  return slugMatch ? slugMatch[1] : '';
}

function inferGenreFromState(projectRoot) {
  const statePath = path.join(projectRoot, '.sgo', 'STATE.md');
  if (!fileExists(statePath)) return '';
  const stateContent = readText(statePath);

  const explicitSlug = stateContent.match(/类型识别：.*（([^)]+)）/);
  if (explicitSlug) return explicitSlug[1].trim();

  const displayMatch = stateContent.match(/写作类型:\s*(.+)/);
  if (displayMatch) {
    const display = displayMatch[1].trim();
    const mapping = buildDisplayNameMap();
    if (mapping.has(display)) return mapping.get(display);
  }

  return '';
}

function inferGenre(projectRoot) {
  const artifactPaths = [
    path.join(projectRoot, '.sgo', 'outline', 'outline.md'),
    path.join(projectRoot, '.sgo', 'constitution', 'constitution.md'),
    path.join(projectRoot, '.sgo', 'research', 'report.md'),
  ];

  for (const artifactPath of artifactPaths) {
    if (!fileExists(artifactPath)) continue;
    const slug = parseGenreConfigRef(readText(artifactPath));
    if (slug) return slug;
  }

  return inferGenreFromState(projectRoot);
}

function deepMerge(baseValue, overrideValue) {
  if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
    return [...overrideValue];
  }

  if (isObject(baseValue) && isObject(overrideValue)) {
    const merged = { ...baseValue };
    for (const [key, value] of Object.entries(overrideValue)) {
      merged[key] = key in merged ? deepMerge(merged[key], value) : value;
    }
    return merged;
  }

  return overrideValue === undefined ? baseValue : overrideValue;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function countSources(reportContent) {
  if (!reportContent) return 0;
  const match = reportContent.match(/sources_consulted:\s*\n((?:\s+- .+\n?)*)/);
  if (!match) return 0;
  return match[1]
    .split('\n')
    .filter(line => line.trim().startsWith('- '))
    .length;
}

function hasMethodOrProblemStatement(reportContent) {
  if (!reportContent) return false;
  const patterns = [
    /研究方法/,
    /方法论/,
    /方法/,
    /问题定义/,
    /研究问题/,
    /method/i,
    /problem statement/i,
  ];
  return patterns.some(pattern => pattern.test(reportContent));
}

function computeMinimumContext(projectRoot, genreSlug, methodologyProfile) {
  const settings = methodologyProfile.minimum_viable_context || {};
  const reportPath = path.join(projectRoot, '.sgo', 'research', 'report.md');
  const statePath = path.join(projectRoot, '.sgo', 'STATE.md');
  const reportContent = safeRead(reportPath);
  const stateContent = safeRead(statePath);
  const sourceCount = countSources(reportContent);

  const slotEvaluators = {
    topic_defined: () => /topic:\s*"[^"]+"/.test(reportContent) || /主题：/.test(stateContent),
    genre_identified: () => Boolean(genreSlug),
    source_basis_present: () => sourceCount >= Number(settings.min_sources || 1),
    research_report_present: () => Boolean(reportContent),
    method_or_problem_statement: () => {
      if (genreSlug !== 'tech-paper') return true;
      return hasMethodOrProblemStatement(reportContent);
    },
  };

  const requiredSlots = Array.isArray(settings.required_slots) ? settings.required_slots : [];
  const satisfied = [];
  const missing = [];

  for (const slot of requiredSlots) {
    const evaluator = slotEvaluators[slot];
    const ok = evaluator ? evaluator() : false;
    if (ok) {
      satisfied.push(slot);
    } else {
      missing.push(slot);
    }
  }

  const warnings = [];
  if (missing.length > 0) {
    warnings.push(
      `minimum_viable_context 未满足：缺少 ${missing.join(', ')}。当前策略为软警告，不阻断流程。`
    );
  }

  if (sourceCount < Number(settings.min_sources || 1)) {
    warnings.push(
      `来源数量不足：当前 ${sourceCount}，要求至少 ${Number(settings.min_sources || 1)}。`
    );
  }

  return {
    enabled: Boolean(settings.enabled),
    enforcement: settings.enforcement || 'soft_warning',
    required_slots: requiredSlots,
    satisfied_slots: satisfied,
    missing_slots: missing,
    min_sources_required: Number(settings.min_sources || 1),
    sources_found: sourceCount,
    status: missing.length > 0 ? 'warn' : 'pass',
    warnings,
  };
}

function relativeToProject(projectRoot, targetPath) {
  return path.relative(projectRoot, targetPath) || '.';
}

function renderMarkdown(result) {
  const boundary = result.methodology_profile.human_oversight_checkpoints?.boundaries || {};
  const contextCheck = result.minimum_viable_context_check || {};
  const warningLines = (result.governance_warnings || []).map(item => `- ${item}`).join('\n') || '- none';

  return [
    '# Resolved Methodology Profile',
    '',
    `- resolved_at: ${result.resolved_at}`,
    `- runtime_root: ${result.runtime_root}`,
    `- genre: ${result.genre}`,
    `- display_name: ${result.display_name}`,
    '',
    '## Source Chain',
    '',
    `- defaults: ${result.source_chain.defaults}`,
    `- genre_config: ${result.source_chain.genre_config}`,
    `- override: ${result.source_chain.override || 'none'}`,
    '',
    '## Minimum Viable Context',
    '',
    `- status: ${contextCheck.status || 'unknown'}`,
    `- enforcement: ${contextCheck.enforcement || 'soft_warning'}`,
    `- missing_slots: ${(contextCheck.missing_slots || []).join(', ') || 'none'}`,
    `- sources_found: ${contextCheck.sources_found || 0}`,
    '',
    '## Governance Boundaries',
    '',
    `- always_do: ${(boundary.always_do || []).join(' | ') || 'none'}`,
    `- ask_first: ${(boundary.ask_first || []).join(' | ') || 'none'}`,
    `- never_do: ${(boundary.never_do || []).join(' | ') || 'none'}`,
    '',
    '## Warnings',
    '',
    warningLines,
    '',
  ].join('\n');
}

function loadDefaults() {
  return JSON.parse(readText(DEFAULTS_FILE));
}

function resolveMethodology(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const genreSlug = options.genreSlug || inferGenre(projectRoot);
  if (!genreSlug) {
    throw new Error('Unable to infer genre slug for methodology resolution.');
  }

  const defaults = loadDefaults();
  const configPath = path.join(CONFIG_DIR, `${genreSlug}.md`);
  if (!fileExists(configPath)) {
    throw new Error(`Type config not found: ${configPath}`);
  }

  const configMeta = loadConfigMeta(configPath);
  const overridePath = configMeta.methodology_profile_ref
    ? path.join(projectRoot, configMeta.methodology_profile_ref)
    : '';
  const overridePayload = overridePath && fileExists(overridePath)
    ? JSON.parse(readText(overridePath))
    : {};

  const methodologyProfile = deepMerge(
    defaults.methodology_profile || {},
    overridePayload.methodology_profile || {}
  );
  const minimumContext = computeMinimumContext(projectRoot, genreSlug, methodologyProfile);

  const result = {
    schema_version: defaults.schema_version || 1,
    runtime_contract: defaults.runtime_contract || 'sgo-methodology-profile-v1',
    resolved_at: new Date().toISOString(),
    runtime_root: relativeToProject(projectRoot, RUNTIME_ROOT),
    genre: genreSlug,
    display_name: configMeta.display_name || genreSlug,
    source_chain: {
      defaults: relativeToProject(projectRoot, DEFAULTS_FILE),
      genre_config: relativeToProject(projectRoot, configPath),
      override: overridePath ? relativeToProject(projectRoot, overridePath) : null,
    },
    methodology_profile: methodologyProfile,
    minimum_viable_context_check: minimumContext,
    governance_warnings: [...(minimumContext.warnings || [])],
  };

  if (options.write !== false) {
    const methodologyDir = path.join(projectRoot, '.sgo', 'methodology');
    fs.mkdirSync(methodologyDir, { recursive: true });
    fs.writeFileSync(
      path.join(methodologyDir, 'profile.resolved.json'),
      `${JSON.stringify(result, null, 2)}\n`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(methodologyDir, 'profile.resolved.md'),
      `${renderMarkdown(result)}\n`,
      'utf8'
    );
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command !== 'resolve') {
    throw new Error(`Unsupported command: ${args.command}`);
  }
  const result = resolveMethodology({
    genreSlug: args.genre,
    projectRoot: args.projectRoot,
    write: args.write,
  });
  if (args.jsonOnly) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderMarkdown(result)}\n`);
  }
}

module.exports = {
  resolveMethodology,
  inferGenre,
  loadConfigMeta,
  computeMinimumContext,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
