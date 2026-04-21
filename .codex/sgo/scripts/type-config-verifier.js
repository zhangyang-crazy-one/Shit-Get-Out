#!/usr/bin/env node
// Type Config Verifier — validates all 7 type configurations
// Usage: node type-config-verifier.js [typeSlug]
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');

// All 7 type slugs
function listAllTypes() {
  return ['web-novel', 'short-story', 'detective', 'romance', 'philosophical', 'sci-fi', 'tech-paper'];
}

// Load and parse a type config file
function loadTypeConfig(typeSlug) {
  const configPath = path.join(CONFIG_DIR, `${typeSlug}.md`);
  try {
    if (!fs.existsSync(configPath)) {
      return { success: false, error: `File not found: ${configPath}`, config: null };
    }
    const content = fs.readFileSync(configPath, 'utf8');
    // Parse YAML frontmatter (between --- lines)
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      return { success: false, error: 'No YAML frontmatter found', config: null };
    }
    const frontmatter = match[1];
    // Extract all top-level keys (lines starting at column 0 with no leading spaces)
    const yaml = {};
    const lines = frontmatter.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Top-level keys have no leading spaces and contain ':'
      if (!line.startsWith(' ') && !line.startsWith('\t') && line.includes(':')) {
        const colonIdx = line.indexOf(':');
        const key = line.slice(0, colonIdx).trim();
        // Check if value is on same line or starts a nested block
        const rest = line.slice(colonIdx + 1).trim();
        if (rest === '' || rest === '|') {
          // Empty value or block scalar - check next non-empty line
          let hasContent = false;
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            // If next line is indented, there's content
            if (nextLine.trim() !== '' && (nextLine.startsWith('  ') || nextLine.startsWith('\t'))) {
              hasContent = true;
              break;
            }
            // If next line is another top-level key, no content
            if (!nextLine.startsWith(' ') && !nextLine.startsWith('\t') && nextLine.includes(':')) {
              break;
            }
          }
          yaml[key] = hasContent ? '(nested)' : '(empty)';
        } else {
          yaml[key] = rest;
        }
      }
    }
    return { success: true, config: yaml, error: null, frontmatter };
  } catch (e) {
    return { success: false, error: e.message, config: null };
  }
}

// Verify required fields exist
// Note: template_variants can be inside quality_rules OR at top level
// Note: iron_rule_categories can be inside constitution_defaults OR at top level
// Strategy: Check for presence of field keys in frontmatter content (anywhere in nested structure)
function verifyRequiredFields(config, typeSlug, frontmatter) {
  // Required field keys that must exist somewhere in the YAML
  const requiredKeys = ['quality_rules', 'template_variants', 'iron_rule_categories', 'writing_flow'];
  const missing = [];

  // Check frontmatter content for each required key
  for (const key of requiredKeys) {
    // Key exists if it's a top-level key with content OR nested within another field
    const inFrontmatter = frontmatter && frontmatter.includes(key + ':');
    if (!inFrontmatter) {
      missing.push(key);
    }
  }

  return { valid: missing.length === 0, missing, extra: [] };
}

// Verify all 7 types
function verifyAllTypes() {
  const results = {};
  for (const type of listAllTypes()) {
    const loaded = loadTypeConfig(type);
    if (!loaded.success) {
      results[type] = { pass: false, error: loaded.error, missing: requiredKeys };
      continue;
    }
    const verified = verifyRequiredFields(loaded.config, type, loaded.frontmatter);
    results[type] = {
      pass: verified.valid,
      missing: verified.missing,
      fields: Object.keys(loaded.config)
    };
  }
  const passed = Object.values(results).filter(r => r.pass).length;
  return { results, summary: { pass: passed, fail: 7 - passed } };
}

module.exports = { loadTypeConfig, verifyRequiredFields, verifyAllTypes, listAllTypes };

// ===== Main (run only when executed directly) =====
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    // Verify specific type
    const result = loadTypeConfig(args[0]);
    if (result.success) {
      const verified = verifyRequiredFields(result.config, args[0], result.frontmatter);
      console.log(`Type: ${args[0]}`);
      console.log(`Valid: ${verified.valid}`);
      if (!verified.valid) console.log(`Missing: ${verified.missing.join(', ')}`);
      console.log(`Fields: ${Object.keys(result.config).join(', ')}`);
    } else {
      console.log(`FAIL: ${result.error}`);
    }
  } else {
    // Verify all types
    const all = verifyAllTypes();
    console.log(`\n=== Type Config Verification ===`);
    console.log(`Total: 7 types — PASS: ${all.summary.pass}, FAIL: ${all.summary.fail}`);
    console.log(`\n| Type | Status | Fields |`);
    console.log(`|------|--------|-------|`);
    for (const [type, result] of Object.entries(all.results)) {
      const status = result.pass ? '✓ PASS' : '✗ FAIL';
      const fields = result.fields ? result.fields.length : 0;
      const missing = result.missing ? ` (missing: ${result.missing.join(', ')})` : '';
      console.log(`| ${type} | ${status} | ${fields}${missing} |`);
    }
    console.log(`\npass: ${all.summary.pass}`);
    process.exit(all.summary.fail > 0 ? 1 : 0);
  }
}
