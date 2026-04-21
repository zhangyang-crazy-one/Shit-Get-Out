#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$PWD"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
DRY_RUN=0
UNINSTALL=0
BRAND="SGO / Shit Get Out"
TERMINAL="auto"

usage() {
  cat <<'USAGE'
Usage: scripts/install-codex.sh [options]

Install the Codex version of SGO into the current project and $CODEX_HOME.

Options:
  --project DIR              Target project directory (default: current directory)
  --codex-home DIR           Codex home directory (default: $CODEX_HOME or ~/.codex)
  --brand NAME               Display brand name only (default: SGO / Shit Get Out)
  --shell NAME               Terminal shell: auto|bash|zsh|fish|pwsh
  --terminal NAME            Alias for --shell
  --dry-run                  Print actions without changing files
  --uninstall                Remove Codex SGO entrypoints/hooks, keep .sgo/ data
  -h, --help                 Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ROOT="$2"
      shift 2
      ;;
    --codex-home)
      CODEX_HOME="$2"
      shift 2
      ;;
    --brand)
      BRAND="$2"
      shift 2
      ;;
    --shell|--terminal)
      TERMINAL="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --uninstall)
      UNINSTALL=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  PROJECT_PARENT="$(cd -- "$(dirname -- "$PROJECT_ROOT")" 2>/dev/null && pwd || pwd)"
  CODEX_PARENT="$(cd -- "$(dirname -- "$CODEX_HOME")" 2>/dev/null && pwd || pwd)"
  PROJECT_ROOT="$PROJECT_PARENT/$(basename -- "$PROJECT_ROOT")"
  CODEX_HOME="$CODEX_PARENT/$(basename -- "$CODEX_HOME")"
else
  PROJECT_ROOT="$(mkdir -p "$PROJECT_ROOT" && cd -- "$PROJECT_ROOT" && pwd)"
  CODEX_HOME="$(mkdir -p "$CODEX_HOME" && cd -- "$CODEX_HOME" && pwd)"
fi

if [[ "$TERMINAL" == "auto" ]]; then
  case "${SHELL:-}" in
    */zsh) TERMINAL="zsh" ;;
    */fish) TERMINAL="fish" ;;
    */pwsh|*/powershell) TERMINAL="pwsh" ;;
    *) TERMINAL="bash" ;;
  esac
fi

case "$TERMINAL" in
  auto|bash|zsh|fish|pwsh) ;;
  *)
    echo "Unsupported shell: $TERMINAL" >&2
    exit 2
    ;;
esac

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

backup_file() {
  local file="$1"
  if [[ -f "$file" && "$DRY_RUN" -eq 0 ]]; then
    cp "$file" "$file.bak.$(date +%Y%m%d%H%M%S)"
  elif [[ -f "$file" ]]; then
    echo "[dry-run] backup $file"
  fi
}

ensure_generated_codex() {
  if [[ ! -d "$SOURCE_ROOT/.codex/sgo" || ! -d "$SOURCE_ROOT/.codex/skills/sgo-init" ]]; then
    run python3 "$SOURCE_ROOT/scripts/generate-codex-sgo.py"
  fi
}

write_brand_file() {
  local install_dir="$PROJECT_ROOT/.sgo/install"
  run mkdir -p "$install_dir"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] write $install_dir/codex.env"
    return
  fi
  cat > "$install_dir/codex.env" <<EOF
SGO_BRAND='$BRAND'
SGO_TERMINAL='$TERMINAL'
SGO_RUNTIME='codex'
SGO_CODEX_HOME='$CODEX_HOME'
EOF
}

install_project_files() {
  ensure_generated_codex
  run mkdir -p "$PROJECT_ROOT/.codex"
  if [[ "$(cd "$SOURCE_ROOT" && pwd)" != "$PROJECT_ROOT" ]]; then
    run rm -rf "$PROJECT_ROOT/.codex/sgo"
    run mkdir -p "$PROJECT_ROOT/.codex/sgo"
    run cp -a "$SOURCE_ROOT/.codex/sgo/." "$PROJECT_ROOT/.codex/sgo/"
    run cp "$SOURCE_ROOT/.codex/hooks.json" "$PROJECT_ROOT/.codex/hooks.json"
  else
    run cp "$SOURCE_ROOT/.codex/hooks.json" "$PROJECT_ROOT/.codex/hooks.json"
  fi
  write_brand_file
}

install_home_files() {
  ensure_generated_codex
  run mkdir -p "$CODEX_HOME/skills" "$CODEX_HOME/agents"
  for skill in "$SOURCE_ROOT"/.codex/skills/sgo-*; do
    [[ -d "$skill" ]] || continue
    run rm -rf "$CODEX_HOME/skills/$(basename "$skill")"
    run cp -a "$skill" "$CODEX_HOME/skills/$(basename "$skill")"
  done
  for agent in "$SOURCE_ROOT"/.codex/agents/sgo-*.toml; do
    [[ -f "$agent" ]] || continue
    run cp "$agent" "$CODEX_HOME/agents/$(basename "$agent")"
  done
}

update_codex_config() {
  local config="$CODEX_HOME/config.toml"
  backup_file "$config"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] enable [features].codex_hooks and update SGO managed block in $config"
    return
  fi
  node - "$config" "$CODEX_HOME" "$BRAND" <<'NODE'
const fs = require('fs');
const path = require('path');
const [configPath, codexHome, brand] = process.argv.slice(2);
let text = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';

function ensureFeature(src) {
  const blockPattern = /^\[features\]\n([\s\S]*?)(?=^\[|$(?![\r\n]))/m;
  if (blockPattern.test(src)) {
    return src.replace(blockPattern, (block) => {
      if (/^codex_hooks\s*=/m.test(block)) {
        return block.replace(/^codex_hooks\s*=.*$/m, 'codex_hooks = true');
      }
      return block.replace(/\s*$/, '') + '\ncodex_hooks = true\n\n';
    });
  }
  return src.replace(/\s*$/, '') + '\n\n[features]\ncodex_hooks = true\n';
}

function escapeTomlString(value) {
  return JSON.stringify(value);
}

text = ensureFeature(text);
const agentNames = [
  'sgo-constitutioner',
  'sgo-designer',
  'sgo-finalizer',
  'sgo-outliner',
  'sgo-researcher',
  'sgo-tracker',
  'sgo-validator',
  'sgo-writer',
];
const blockLines = [
  '# >>> SGO managed block',
  `# brand = ${escapeTomlString(brand)}`,
  '# Use $sgo-* skills. Project writing artifacts stay in .sgo/.',
  '',
];
for (const name of agentNames) {
  const agentPath = path.join(codexHome, 'agents', `${name}.toml`);
  blockLines.push(`[agents.${name}]`);
  blockLines.push(`config_file = ${escapeTomlString(agentPath)}`);
  blockLines.push('');
}
blockLines.push('# <<< SGO managed block');
const block = blockLines.join('\n') + '\n';
const managedPattern = /# >>> SGO managed block[\s\S]*?# <<< SGO managed block\n?/;
text = managedPattern.test(text)
  ? text.replace(managedPattern, block)
  : text.replace(/\s*$/, '') + '\n\n' + block;
fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, text);
NODE
}

remove_codex_config() {
  local config="$CODEX_HOME/config.toml"
  [[ -f "$config" ]] || return 0
  backup_file "$config"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] remove SGO managed block from $config"
    return
  fi
  node - "$config" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
let text = fs.readFileSync(path, 'utf8');
text = text.replace(/\n?# >>> SGO managed block[\s\S]*?# <<< SGO managed block\n?/g, '\n');
fs.writeFileSync(path, text.replace(/\n{3,}/g, '\n\n'));
NODE
}

uninstall_framework() {
  remove_codex_config
  for skill in "$CODEX_HOME"/skills/sgo-*; do
    [[ -e "$skill" ]] || continue
    run rm -rf "$skill"
  done
  for agent in "$CODEX_HOME"/agents/sgo-*.toml; do
    [[ -e "$agent" ]] || continue
    run rm -f "$agent"
  done
  if [[ "$(cd "$SOURCE_ROOT" && pwd)" != "$PROJECT_ROOT" ]]; then
    run rm -rf "$PROJECT_ROOT/.codex/sgo"
    run rm -f "$PROJECT_ROOT/.codex/hooks.json"
  else
    echo "Keeping source .codex/sgo and .codex/hooks.json in framework repository."
  fi
  echo "Codex SGO removed from $PROJECT_ROOT and $CODEX_HOME; shared .sgo/ writing data was kept."
}

if [[ "$UNINSTALL" -eq 1 ]]; then
  uninstall_framework
else
  install_project_files
  install_home_files
  update_codex_config
  echo "$BRAND installed for Codex in $PROJECT_ROOT"
  echo "Use \$sgo-init, \$sgo-start, \$sgo-status, \$sgo-write, \$sgo-validate, \$sgo-review, \$sgo-export, \$sgo-continue, \$sgo-doctor"
  echo "Codex hooks require [features] codex_hooks = true; this installer enabled it in $CODEX_HOME/config.toml"
fi
