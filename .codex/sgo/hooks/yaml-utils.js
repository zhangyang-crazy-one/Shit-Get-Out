const path = require('path');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeScalar(value) {
  const trimmed = (value || '').trim();
  const quoted = trimmed.match(/^(['"])([\s\S]*)\1$/);
  return quoted ? quoted[2] : trimmed;
}

function parseScalarField(content, fieldName) {
  const match = content.match(new RegExp(`^${escapeRegExp(fieldName)}:\\s*(.+)$`, 'm'));
  return match ? normalizeScalar(match[1]) : '';
}

function parseYamlListField(content, fieldName) {
  const inlineMatch = content.match(new RegExp(`^${escapeRegExp(fieldName)}:\\s*\\[([^\\]]*)\\]`, 'm'));
  if (inlineMatch) {
    return inlineMatch[1]
      .split(',')
      .map(item => normalizeScalar(item))
      .map(item => item.trim())
      .filter(Boolean);
  }

  const blockMatch = content.match(new RegExp(`^${escapeRegExp(fieldName)}:\\s*\\n([\\s\\S]*?)(?=\\n\\w|\\n---|$)`, 'm'));
  if (!blockMatch) return [];

  return blockMatch[1]
    .match(/-\s*(.+)/g)
    ?.map(line => line.replace(/^\-\s*/, '').trim())
    .map(item => normalizeScalar(item))
    .filter(Boolean) || [];
}

function replaceTopLevelField(content, fieldName, value) {
  const pattern = new RegExp(`^${escapeRegExp(fieldName)}:\\s*.*$`, 'm');
  return pattern.test(content)
    ? content.replace(pattern, `${fieldName}: ${value}`)
    : content;
}

function relativizeForState(stateFile, targetPath) {
  return path.relative(path.dirname(stateFile), targetPath).replace(/\\/g, '/');
}

module.exports = {
  escapeRegExp,
  normalizeScalar,
  parseScalarField,
  parseYamlListField,
  replaceTopLevelField,
  relativizeForState,
};
