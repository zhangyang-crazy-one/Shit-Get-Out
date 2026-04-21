#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$PWD"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
RUNTIME="both"
BRAND="SGO / Shit Get Out"
TERMINAL="auto"
DRY_RUN=0
UNINSTALL=0

usage() {
  cat <<'USAGE'
Usage: scripts/bootstrap.sh [options]

One-command installer for SGO.

Options:
  --runtime NAME             claude | codex | both (default: both)
  --project DIR              Target project directory (default: current directory)
  --codex-home DIR           Codex home directory for Codex install
  --brand NAME               Display brand name only
  --shell NAME               auto | bash | zsh | fish | pwsh
  --terminal NAME            Alias for --shell
  --dry-run                  Print actions without changing files
  --uninstall                Remove installed SGO adapters
  -h, --help                 Show this help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime)
      RUNTIME="$2"
      shift 2
      ;;
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

case "$RUNTIME" in
  claude|codex|both) ;;
  *)
    echo "Unsupported runtime: $RUNTIME" >&2
    exit 2
    ;;
esac

run_install() {
  local script_name="$1"
  shift
  local cmd=(bash "$SCRIPT_DIR/$script_name" --project "$PROJECT_ROOT" --brand "$BRAND" --shell "$TERMINAL")
  if [[ "$script_name" == "install-codex.sh" ]]; then
    cmd+=(--codex-home "$CODEX_HOME")
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    cmd+=(--dry-run)
  fi
  if [[ "$UNINSTALL" -eq 1 ]]; then
    cmd+=(--uninstall)
  fi
  "${cmd[@]}"
}

if [[ "$RUNTIME" == "claude" || "$RUNTIME" == "both" ]]; then
  run_install install-claude.sh
fi

if [[ "$RUNTIME" == "codex" || "$RUNTIME" == "both" ]]; then
  run_install install-codex.sh
fi

if [[ "$UNINSTALL" -eq 1 ]]; then
  echo "SGO bootstrap uninstall complete."
else
  echo "SGO bootstrap install complete."
  echo "Project: $PROJECT_ROOT"
  if [[ "$RUNTIME" == "codex" || "$RUNTIME" == "both" ]]; then
    echo "Codex home: $CODEX_HOME"
  fi
fi
