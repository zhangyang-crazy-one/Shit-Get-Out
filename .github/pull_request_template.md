## Summary

What does this PR change?

## Scope

- Claude adapter
- Codex adapter
- Installers
- Docs
- Release hygiene

## Validation

List what you ran, for example:

- `python3 -m py_compile scripts/generate-codex-sgo.py`
- `bash -n scripts/bootstrap.sh scripts/install-claude.sh scripts/install-codex.sh`
- `node --check ...`

## Checklist

- [ ] No local `.sgo/` or `.planning/` artifacts added
- [ ] No unrelated `.codex/` or `.claude/skills/` content added
- [ ] Codex adapter regenerated if Claude source changed
- [ ] Docs updated if installer or workflow behavior changed
