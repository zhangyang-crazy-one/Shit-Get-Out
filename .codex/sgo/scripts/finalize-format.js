#!/usr/bin/env node
// SGO Script: finalize-format.js
// Purpose: Format output files based on project type
// D-02: Type-default format (TXT+MD for novels, LaTeX for tech-paper)

const fs = require('fs');
const path = require('path');

/**
 * Main export: formatOutput
 * @param {string} projectDir - Project root directory
 * @param {string} projectType - Project type (web-novel, tech-paper, etc.)
 * @param {Array} chapters - Array of chapter objects {filename, content}
 * @param {string} projectTitle - Project title for output
 * @returns {Array} - Array of output file paths
 */
function formatOutput(projectDir, projectType, chapters, projectTitle) {
  const outputDir = path.join(projectDir, '.sgo', 'output');

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const formats = getFormatsForType(projectType);
  const outputFiles = [];

  for (const format of formats) {
    const ext = format;
    const filename = `${sanitizeFilename(projectTitle)}.${ext}`;
    const outputPath = path.join(outputDir, filename);

    let content;
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
  }

  return outputFiles;
}

/**
 * Get output formats for project type
 * D-02: Type-default format
 */
function getFormatsForType(type) {
  const formatMap = {
    'web-novel': ['txt', 'md'],
    'short-story': ['txt', 'md'],
    'romance': ['txt', 'md'],
    'philosophical': ['txt', 'md'],
    'sci-fi': ['txt', 'md'],
    'detective': ['txt', 'md'],
    'tech-paper': ['tex']  // LaTeX for academic papers
  };
  return formatMap[type] || ['txt', 'md'];
}

/**
 * Format as plain text (TXT)
 * Chapter title in brackets, body follows
 */
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

/**
 * Format as Markdown (MD)
 * Chapter as ## heading, body follows
 */
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

/**
 * Format as LaTeX (for tech-paper)
 * IMRaD structure: Introduction, Methods, Results, Discussion
 */
function formatLatex(chapters, title) {
  const sections = chapters.map(ch => {
    const content = stripFrontmatter(ch.content);
    const bodyMatch = content.match(/## 场景正文\n([\s\S]*?)(?=\n##|\n---|$)/);
    return {
      title: ch.title,
      body: bodyMatch ? bodyMatch[1].trim() : ''
    };
  }).filter(s => s.body);

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

${sections.map((s, i) => `\\section{${escapeLatex(s.title)}}
\\label{sec:${i + 1}}

${escapeLatex(s.body)}

`).join('\\newpage\n')}

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}`;
}

/**
 * Remove YAML frontmatter (--- delimited)
 */
function stripFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n/, '');
}

/**
 * Sanitize filename for cross-platform compatibility
 */
function sanitizeFilename(name) {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * Escape special LaTeX characters
 */
function escapeLatex(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, '\\$&')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * CLI entry point
 * Usage: node finalize-format.js <projectDir> <projectType> <title>
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node finalize-format.js <projectDir> <projectType> <title>');
    console.error('Example: node finalize-format.js /path/to/project web-novel "我的小说"');
    process.exit(1);
  }

  const [projectDir, projectType, projectTitle] = args;

  // Load chapters from .sgo/chapters/
  const chaptersDir = path.join(projectDir, '.sgo', 'chapters');
  if (!fs.existsSync(chaptersDir)) {
    console.error(`Chapters directory not found: ${chaptersDir}`);
    process.exit(1);
  }

  const chapterFiles = fs.readdirSync(chaptersDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  const chapters = chapterFiles.map(filename => ({
    filename,
    title: filename.replace('.md', '').replace(/^chapter-\d+-/, ''),
    content: fs.readFileSync(path.join(chaptersDir, filename), 'utf8')
  }));

  console.log(`Formatting ${chapters.length} chapters as ${projectType}...`);

  const outputFiles = formatOutput(projectDir, projectType, chapters, projectTitle);

  console.log(`\nGenerated ${outputFiles.length} output file(s):`);
  outputFiles.forEach(f => console.log(`  - ${f}`));
}

module.exports = { formatOutput, getFormatsForType, formatTxt, formatMarkdown, formatLatex };
