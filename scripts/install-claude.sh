#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$PWD"
DRY_RUN=0
UNINSTALL=0
BRAND="SGO / Shit Get Out"
TERMINAL="auto"

usage() {
  cat <<'USAGE'
Usage: scripts/install-claude.sh [options]

Install the Claude Code version of SGO into the current project.

Options:
  --project DIR              Target project directory (default: current directory)
  --brand NAME               Display brand name only (default: SGO / Shit Get Out)
  --shell NAME               Terminal shell: auto|bash|zsh|fish|pwsh
  --terminal NAME            Alias for --shell
  --dry-run                  Print actions without changing files
  --uninstall                Remove Claude SGO entrypoints and hooks, keep .sgo/ data
  -h, --help                 Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)
      PROJECT_ROOT="$2"
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
  PROJECT_ROOT="$PROJECT_PARENT/$(basename -- "$PROJECT_ROOT")"
else
  PROJECT_ROOT="$(mkdir -p "$PROJECT_ROOT" && cd -- "$PROJECT_ROOT" && pwd)"
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

write_brand_file() {
  local install_dir="$PROJECT_ROOT/.sgo/install"
  run mkdir -p "$install_dir"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] write $install_dir/claude.env"
    return
  fi
  cat > "$install_dir/claude.env" <<EOF
SGO_BRAND='$BRAND'
SGO_TERMINAL='$TERMINAL'
SGO_RUNTIME='claude'
EOF
}

merge_settings() {
  local target_settings="$PROJECT_ROOT/.claude/settings.json"
  local source_settings="$SOURCE_ROOT/.claude/settings.json"
  backup_file "$target_settings"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] merge SGO hooks into $target_settings"
    return
  fi

  node - "$target_settings" "$source_settings" <<'NODE'
const fs = require('fs');
const [targetPath, sourcePath] = process.argv.slice(2);
const readJson = (p) => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
const target = readJson(targetPath);
const source = readJson(sourcePath);
target.hooks = target.hooks || {};
for (const [event, groups] of Object.entries(source.hooks || {})) {
  target.hooks[event] = target.hooks[event] || [];
  for (const group of groups) {
    const next = JSON.parse(JSON.stringify(group));
    next.hooks = (next.hooks || []).filter((hook) => String(hook.command || '').includes('.claude/sgo/hooks/'));
    if (next.hooks.length === 0) continue;
    let existing = target.hooks[event].find((item) => String(item.matcher || '') === String(next.matcher || ''));
    if (!existing) {
      target.hooks[event].push(next);
      continue;
    }
    existing.hooks = existing.hooks || [];
    const commands = new Set(existing.hooks.map((hook) => hook.command));
    for (const hook of next.hooks) {
      if (!commands.has(hook.command)) existing.hooks.push(hook);
    }
  }
}
fs.mkdirSync(require('path').dirname(targetPath), { recursive: true });
fs.writeFileSync(targetPath, JSON.stringify(target, null, 2) + '\n');
NODE
}

remove_settings() {
  local target_settings="$PROJECT_ROOT/.claude/settings.json"
  [[ -f "$target_settings" ]] || return 0
  backup_file "$target_settings"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] remove SGO hooks from $target_settings"
    return
  fi
  node - "$target_settings" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
for (const event of Object.keys(config.hooks || {})) {
  config.hooks[event] = (config.hooks[event] || [])
    .map((group) => ({
      ...group,
      hooks: (group.hooks || []).filter((hook) => !String(hook.command || '').includes('.claude/sgo/hooks/')),
    }))
    .filter((group) => (group.hooks || []).length > 0);
  if (config.hooks[event].length === 0) delete config.hooks[event];
}
if (config.hooks && Object.keys(config.hooks).length === 0) delete config.hooks;
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
NODE
}

install_framework() {
  run mkdir -p "$PROJECT_ROOT/.claude"
  if [[ "$(cd "$SOURCE_ROOT" && pwd)" != "$PROJECT_ROOT" ]]; then
    run rm -rf "$PROJECT_ROOT/.claude/sgo"
    run mkdir -p "$PROJECT_ROOT/.claude/sgo"
    run cp -a "$SOURCE_ROOT/.claude/sgo/." "$PROJECT_ROOT/.claude/sgo/"
  fi

  run mkdir -p "$PROJECT_ROOT/.claude/commands" "$PROJECT_ROOT/.claude/agents"
  for command in "$PROJECT_ROOT"/.claude/sgo/commands/sgo-*.md; do
    [[ -e "$command" ]] || continue
    run ln -sfn "../sgo/commands/$(basename "$command")" "$PROJECT_ROOT/.claude/commands/$(basename "$command")"
  done
  for agent in "$PROJECT_ROOT"/.claude/sgo/agents/sgo-*.md; do
    [[ -e "$agent" ]] || continue
    run ln -sfn "../sgo/agents/$(basename "$agent")" "$PROJECT_ROOT/.claude/agents/$(basename "$agent")"
  done

  merge_settings
  write_brand_file
}

uninstall_framework() {
  remove_settings
  for command in "$PROJECT_ROOT"/.claude/commands/sgo-*.md; do
    [[ -e "$command" || -L "$command" ]] || continue
    run rm -f "$command"
  done
  for agent in "$PROJECT_ROOT"/.claude/agents/sgo-*.md; do
    [[ -e "$agent" || -L "$agent" ]] || continue
    run rm -f "$agent"
  done
  if [[ "$(cd "$SOURCE_ROOT" && pwd)" != "$PROJECT_ROOT" ]]; then
    run rm -rf "$PROJECT_ROOT/.claude/sgo"
  else
    echo "Keeping source .claude/sgo in framework repository."
  fi
  echo "Claude SGO removed from $PROJECT_ROOT; shared .sgo/ writing data was kept."
}

if [[ "$UNINSTALL" -eq 1 ]]; then
  uninstall_framework
else
  install_framework
  echo "$BRAND installed for Claude Code in $PROJECT_ROOT"
  echo "Use /sgo-init, /sgo-start, /sgo-status, /sgo-write, /sgo-validate, /sgo-review, /sgo-export, /sgo-continue, /sgo-doctor"
fi
