#!/usr/bin/env node
// Cross-runtime verification for SGO methodology profile resolution.

const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const claudeResolver = require(path.join(projectRoot, '.claude', 'sgo', 'scripts', 'methodology-profile.js'));
const codexResolver = require(path.join(projectRoot, '.codex', 'sgo', 'scripts', 'methodology-profile.js'));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const claudeResult = claudeResolver.resolveMethodology({
    projectRoot,
    genreSlug: 'tech-paper',
    write: false,
  });
  const codexResult = codexResolver.resolveMethodology({
    projectRoot,
    genreSlug: 'tech-paper',
    write: false,
  });

  assert(claudeResult.methodology_profile.academic_evidence_policy.enabled, 'Claude tech-paper evidence policy must be enabled.');
  assert(codexResult.methodology_profile.academic_evidence_policy.enabled, 'Codex tech-paper evidence policy must be enabled.');

  const claudeProfile = JSON.stringify(claudeResult.methodology_profile);
  const codexProfile = JSON.stringify(codexResult.methodology_profile);
  assert(claudeProfile === codexProfile, 'Claude and Codex resolved methodology profiles must match for tech-paper.');

  assert(
    Array.isArray(claudeResult.minimum_viable_context_check.required_slots) &&
      claudeResult.minimum_viable_context_check.required_slots.includes('method_or_problem_statement'),
    'Tech-paper minimum viable context should require method_or_problem_statement.'
  );

  console.log('SGO methodology verification: PASS');
  console.log(`- Claude defaults: ${claudeResult.source_chain.defaults}`);
  console.log(`- Codex defaults: ${codexResult.source_chain.defaults}`);
  console.log(`- Tech-paper override: ${claudeResult.source_chain.override}`);
  console.log(`- Warning status: ${claudeResult.minimum_viable_context_check.status}`);
}

try {
  main();
} catch (error) {
  console.error(`SGO methodology verification: FAIL\n${error.message}`);
  process.exit(1);
}
