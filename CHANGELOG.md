# Changelog

All notable changes to SGO are documented in this file.

## v1.0 - 2026-04-22

### Added
- End-to-end SGO workflow for project init, research, constitution, outline, validation, writing, review, and finalize
- 7 writing-type configs with type-specific research, writing flow, quality rules, and template variants
- Methodology profile layer with resolved project artifact shared across Claude and Codex
- Tree planning and atomic block outline support
- Academic evidence workflow and claim-label validation for `tech-paper`
- Long-term memory and authorship-control artifacts
- Verification scripts for methodology, tree planning, evidence workflow, and memory/authorship runtime

### Changed
- Writer runtime now supports explicit memory/authorship read chain and adversarial pacing during drafting
- Validator and finalizer now understand authorship-control constraints and drift escalation
- Milestone-close verification coverage and requirement traceability were backfilled and aligned with implementation state

### Notes
- Some early `/sgo-start` and constitution-generation behaviors still rely on accepted human verification rather than fully automated runtime checks
