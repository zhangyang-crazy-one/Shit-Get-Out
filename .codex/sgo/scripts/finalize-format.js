#!/usr/bin/env node
// SGO Script: finalize-format.js
// Purpose: Format output files based on project type.
// D-02: Type-default format (TXT+MD for novels, LaTeX for tech-paper)

const fs = require('fs');
const path = require('path');

const DISPLAY_TYPE_MAP = {
  '网络小说': 'web-novel',
  '短篇小说': 'short-story',
  '言情小说': 'romance',
  '哲理小说': 'philosophical',
  '科幻小说': 'sci-fi',
  '侦探小说': 'detective',
  '科技论文': 'tech-paper'
};

const AUXILIARY_OUTPUT_STEMS = new Set([
  'archive-manifest',
  'final-review',
  'references',
  'result-provenance',
  'tech-workflow-summary'
]);

function resolveProjectLayout(projectDir) {
  const projectRoot = path.resolve(projectDir);
  const nestedStateRoot = path.join(projectRoot, '.sgo');
  const directStateRoot = projectRoot;

  if (fs.existsSync(path.join(nestedStateRoot, 'STATE.md'))) {
    return buildLayout(projectRoot, nestedStateRoot);
  }

  if (fs.existsSync(path.join(directStateRoot, 'STATE.md'))) {
    return buildLayout(projectRoot, directStateRoot);
  }

  throw new Error(`STATE.md not found under ${projectRoot} or ${nestedStateRoot}`);
}

function buildLayout(projectRoot, stateRoot) {
  return {
    projectRoot,
    stateRoot,
    outputDir: path.join(stateRoot, 'output'),
    archiveRoot: findArchiveRoot(stateRoot),
    stateFile: path.join(stateRoot, 'STATE.md'),
    continueFile: path.join(stateRoot, '.continue-here.md'),
    methodologyFile: path.join(stateRoot, 'methodology', 'profile.resolved.json'),
    archiveManifestFile: path.join(stateRoot, 'output', 'archive-manifest.md')
  };
}

function findArchiveRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const parent = path.dirname(current);
    if (path.basename(parent) === '.sgo-archive') {
      return current;
    }
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function readMethodologyProfile(layout) {
  if (!fs.existsSync(layout.methodologyFile)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(layout.methodologyFile, 'utf8'));
  } catch (_error) {
    return null;
  }
}

function parseField(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/^["'`]|["'`]$/g, '');
    }
  }
  return '';
}

function detectProjectType(layout, stateContent = readTextIfExists(layout.stateFile)) {
  const profile = readMethodologyProfile(layout);
  if (profile?.genre) {
    return profile.genre;
  }

  const rawType = parseField(stateContent, [
    /^\*\*写作类型:\*\*\s*(.+)$/m,
    /^\*\*项目类型:\*\*\s*(.+)$/m,
    /^写作类型:\s*(.+)$/m,
    /^项目类型:\s*(.+)$/m
  ]);

  if (DISPLAY_TYPE_MAP[rawType]) {
    return DISPLAY_TYPE_MAP[rawType];
  }

  return rawType || 'web-novel';
}

function detectProjectTitle(layout, stateContent = readTextIfExists(layout.stateFile)) {
  const explicitTitle = parseField(stateContent, [
    /^\*\*项目标题:\*\*\s*(.+)$/m,
    /^\*\*写作标题:\*\*\s*(.+)$/m,
    /^项目标题:\s*(.+)$/m,
    /^写作标题:\s*(.+)$/m,
    /^标题:\s*(.+)$/m
  ]);
  if (explicitTitle) {
    return explicitTitle;
  }

  const manifestTitle = parseField(readTextIfExists(layout.archiveManifestFile), [
    /^- 标题:\s*`(.+)`$/m,
    /^标题:\s*(.+)$/m
  ]);
  if (manifestTitle) {
    return manifestTitle;
  }

  const outputStem = detectTitleFromOutputFiles(layout, stateContent);
  if (outputStem) {
    return outputStem;
  }

  const singleChapterTitle = detectSingleChapterTitle(stateContent);
  if (singleChapterTitle) {
    return singleChapterTitle;
  }

  return path.basename(layout.projectRoot) || 'Untitled';
}

function detectTitleFromOutputFiles(layout, stateContent) {
  const candidates = [];
  const stateOutputMatches = stateContent.match(/(?:\.sgo\/)?output\/([^\n"'`\]]+)\.(txt|md|tex)/g) || [];
  for (const raw of stateOutputMatches) {
    const match = raw.match(/output\/(.+)\.(txt|md|tex)/);
    if (match) {
      candidates.push(match[1]);
    }
  }

  if (fs.existsSync(layout.outputDir)) {
    for (const file of fs.readdirSync(layout.outputDir)) {
      const ext = path.extname(file);
      if (!['.txt', '.md', '.tex'].includes(ext)) {
        continue;
      }
      candidates.push(path.basename(file, ext));
    }
  }

  for (const candidate of candidates) {
    if (!candidate || AUXILIARY_OUTPUT_STEMS.has(candidate)) {
      continue;
    }
    return candidate;
  }

  return '';
}

function detectSingleChapterTitle(stateContent) {
  const quotedChapter = stateContent.match(/completed_chapters:\s*\n\s*-\s*"[^《\n]+《([^》\n]+)》/m);
  if (quotedChapter?.[1]) {
    return quotedChapter[1].trim();
  }

  const mappedChapter = stateContent.match(/completed_chapters:\s*\n[\s\S]*?\n\s*title:\s*"([^"\n]+)"/m);
  if (mappedChapter?.[1]) {
    return mappedChapter[1].trim();
  }

  return '';
}

function normalizeFormatsForType(type) {
  const formatMap = {
    'web-novel': ['txt', 'md'],
    'short-story': ['txt', 'md'],
    'romance': ['txt', 'md'],
    'philosophical': ['txt', 'md'],
    'sci-fi': ['txt', 'md'],
    'detective': ['txt', 'md'],
    'tech-paper': ['tex']
  };
  return formatMap[type] || ['txt', 'md'];
}

function normalizeFormatArg(formatArg, projectType) {
  if (!formatArg || (Array.isArray(formatArg) && formatArg.length === 0)) {
    return normalizeFormatsForType(projectType);
  }

  const parts = Array.isArray(formatArg)
    ? formatArg
    : String(formatArg).split(/[,\s]+/).filter(Boolean);

  const normalized = parts.map((part) => {
    const lower = part.toLowerCase();
    if (lower === 'markdown') return 'md';
    if (lower === 'latex') return 'tex';
    return lower;
  });

  const unique = [...new Set(normalized)];
  const invalid = unique.filter((format) => !['txt', 'md', 'tex'].includes(format));
  if (invalid.length > 0) {
    throw new Error(`Unsupported format(s): ${invalid.join(', ')}`);
  }

  return unique;
}

function formatOutput(projectDir, projectType, chapters, projectTitle, options = {}) {
  const layout = resolveProjectLayout(projectDir);
  ensureDir(layout.outputDir);

  const formats = normalizeFormatArg(options.formats, projectType);
  const outputFiles = [];

  for (const format of formats) {
    const filename = `${sanitizeFilename(projectTitle)}.${format}`;
    const outputPath = path.join(layout.outputDir, filename);

    let content = '';
    if (format === 'txt') {
      content = formatTxt(chapters, projectTitle);
    } else if (format === 'md') {
      content = formatMarkdown(chapters, projectTitle);
    } else if (format === 'tex') {
      content = formatLatex(chapters, projectTitle);
    }

    fs.writeFileSync(outputPath, content, 'utf8');
    outputFiles.push(outputPath);
    console.log(`Generated: ${outputPath}`);

    if (layout.archiveRoot && options.publishToArchiveRoot !== false) {
      const publishPath = path.join(layout.archiveRoot, filename);
      fs.writeFileSync(publishPath, content, 'utf8');
      outputFiles.push(publishPath);
      console.log(`Published: ${publishPath}`);
    }
  }

  return outputFiles;
}

function formatTxt(chapters, title) {
  let output = `${title}\n${'='.repeat(title.length)}\n\n`;

  for (const chapter of chapters) {
    const content = stripFrontmatter(chapter.content);
    const bodyMatch = content.match(/## 场景正文\n([\s\S]*?)(?=\n##|\n---|$)/);

    output += `【${chapter.title}】\n\n`;
    if (bodyMatch) {
      output += bodyMatch[1].trim() + '\n\n';
    }
  }

  return output;
}

function formatMarkdown(chapters, title) {
  let output = `# ${title}\n\n`;

  for (const chapter of chapters) {
    const content = stripFrontmatter(chapter.content);
    const bodyMatch = content.match(/## 场景正文\n([\s\S]*?)(?=\n##|\n---|$)/);

    output += `## ${chapter.title}\n\n`;
    if (bodyMatch) {
      output += bodyMatch[1].trim() + '\n\n';
    }
  }

  return output;
}

function formatLatex(chapters, title) {
  const sections = chapters.map((chapter) => {
    const content = stripFrontmatter(chapter.content);
    const bodyMatch = content.match(/## 场景正文\n([\s\S]*?)(?=\n##|\n---|$)/);
    return {
      title: chapter.title,
      body: bodyMatch ? bodyMatch[1].trim() : ''
    };
  }).filter((section) => section.body);

  return `\\documentclass{article}
\\usepackage[UTF8]{ctex}
\\usepackage{natbib}
\\usepackage{geometry}
\\geometry{margin=1in}

\\begin{document}

\\title{${escapeLatex(title)}}
\\maketitle

\\section{摘要}
\\label{sec:abstract}
% 请在此处添加摘要内容

\\newpage

${sections.map((section, index) => `\\section{${escapeLatex(section.title)}}
\\label{sec:${index + 1}}

${escapeLatex(section.body)}

`).join('\\newpage\n')}

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`;
}

function stripFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n/, '');
}

function parseChapterTitle(content, fallbackFilename) {
  const frontmatterTitle = content.match(/^title:\s*"([^"]+)"$/m);
  if (frontmatterTitle) {
    return frontmatterTitle[1].trim();
  }
  return fallbackFilename.replace('.md', '').replace(/^chapter-\d+-?/, '');
}

function loadProjectChapters(projectDir) {
  const layout = resolveProjectLayout(projectDir);
  const chaptersDir = path.join(layout.stateRoot, 'chapters');
  const draftsDir = path.join(layout.stateRoot, 'drafts');
  const preferredDir = hasMarkdownFiles(chaptersDir) ? chaptersDir : draftsDir;

  if (!hasMarkdownFiles(preferredDir)) {
    throw new Error(`No chapter markdown files found under ${chaptersDir} or ${draftsDir}`);
  }

  return fs.readdirSync(preferredDir)
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN', { numeric: true }))
    .map((filename) => {
      const fullPath = path.join(preferredDir, filename);
      const content = fs.readFileSync(fullPath, 'utf8');
      return {
        filename,
        content,
        title: parseChapterTitle(content, filename)
      };
    });
}

function hasMarkdownFiles(dirPath) {
  return fs.existsSync(dirPath) && fs.readdirSync(dirPath).some((file) => file.endsWith('.md'));
}

function toProjectRelative(projectRoot, filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

function escapeLatex(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node finalize-format.js <projectDir> [projectType] [title] [formats]');
    console.error('Example: node finalize-format.js /path/to/project philosophical "失路" md');
    process.exit(1);
  }

  try {
    const [projectDir, explicitType, explicitTitle, explicitFormats] = args;
    const layout = resolveProjectLayout(projectDir);
    const stateContent = readTextIfExists(layout.stateFile);
    const projectType = explicitType || detectProjectType(layout, stateContent);
    const projectTitle = explicitTitle || detectProjectTitle(layout, stateContent);
    const chapters = loadProjectChapters(projectDir);

    console.log(`Formatting ${chapters.length} chapters as ${projectType}...`);

    const outputFiles = formatOutput(projectDir, projectType, chapters, projectTitle, {
      formats: explicitFormats
    });

    console.log(`\nGenerated ${outputFiles.length} output file(s):`);
    outputFiles.forEach((file) => console.log(`  - ${file}`));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  AUXILIARY_OUTPUT_STEMS,
  detectProjectTitle,
  detectProjectType,
  escapeLatex,
  findArchiveRoot,
  formatLatex,
  formatMarkdown,
  formatOutput,
  formatTxt,
  hasMarkdownFiles,
  loadProjectChapters,
  normalizeFormatArg,
  parseChapterTitle,
  readMethodologyProfile,
  readTextIfExists,
  resolveProjectLayout,
  sanitizeFilename,
  stripFrontmatter,
  toProjectRelative
};
