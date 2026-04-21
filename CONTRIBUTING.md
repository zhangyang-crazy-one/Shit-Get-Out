# Contributing

Thanks for contributing to `Shit Get Out` (`SGO`).

## Scope

This public repository is for the SGO framework itself:

- `.claude/sgo/`
- `.codex/sgo/`
- `.codex/skills/sgo-*`
- `.codex/agents/sgo-*`
- installer and generator scripts
- public documentation

Do not commit local project state or personal runtime artifacts such as:

- `.sgo/`
- `.planning/`
- `resources/`
- `videos/`
- unrelated local skills under `.codex/` or `.claude/skills/`

## Development Flow

1. Update the Claude source of truth under `.claude/sgo/` when changing workflow logic.
2. Regenerate the Codex adapter:

```bash
python3 scripts/generate-codex-sgo.py
```

3. Validate:

```bash
python3 -m py_compile scripts/generate-codex-sgo.py
bash -n scripts/bootstrap.sh scripts/install-claude.sh scripts/install-codex.sh
```

4. If you change hook JS or support scripts, also run:

```bash
node --check .codex/sgo/hooks/codex-hook-adapter.js
for f in .codex/sgo/hooks/*.js .codex/sgo/scripts/*.js; do node --check "$f"; done
```

## Pull Requests

Please keep PRs focused.

Good PR examples:

- improve one workflow stage
- fix one installer bug
- regenerate Codex adapter after a Claude-side source change
- improve public docs or release hygiene

Avoid mixing:

- framework changes
- local story project outputs
- generated media
- unrelated experimental skills

## Design Notes

SGO explicitly references `Get Shit Done` as an inspiration for workflow decomposition and agent discipline, but this repo is for writing workflows rather than generic coding delivery workflows.
