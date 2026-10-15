# Changelog

Versões do Main Harness (versionamento semântico; `0.y.z` até a 1.0).

## [0.1.2] - 2026-10-15

### Correções

- fix(setup): sh shim uses C:/ path so it works in any bash

## [0.1.1] - 2026-10-15

### Correções

- fix(attach,setup): hx on PATH via shims, git init on attach

### Outros

- chore(harness): migrate to v0.1.0

## [0.1.0] - 2026-10-15

### Novidades

- feat(hx): doctor requires Claude Code 2.1.280+; attach Main Harness to itself (T14)
- feat(hx): session-start, post-edit lint and repo map, pre-bash guard, stop/compact context handling (T04)
- feat(skills): adr, prd, sprint-plan, release-report, handoff and security-review with evals (T09)
- feat(hx): attach with reorg plan, lint setup, plugins and optional catalog (T06a)
- feat(hx): sprint, task, review, metrics, handoff, run and request commands (T05)
- feat(hx): release with skill eval gate and stable clone; rollback (T07)
- feat(plugin): agents, commands, hooks config and hx launchers (T08)
- feat(hx): migrate, doctor and setup commands with attach bootstrap skill (T06b)
- feat(hx): usage adapter reading Claude Code transcripts with dedupe and pricing (T03)
- feat(skills): add archify, adapted tdd-workflow, optional web skills and skill-creator with SOURCE.md (T10)
- feat(hx): core paths, config, projects, state and event schema with validation (T02)

### Outros

- S00 execution log update
- Skill evals for all distributed skills; frontend-design moved to skills-pending
- pre-bash: expand command-line and env variables; allow deletes in Claude temp scratch
- Add reviewer regression cases for pre-bash (recheck 3)
- Fix pre-bash second review: find in project root, PowerShell prefixes, xargs
- Close pre-bash bypasses and reject non-slug project ids (review T13)
- Move sprint execution log to SNN-release.md as a table in Brasilia time
- chore: ignore python caches
- docs: full repo map in index.md
- test(hx): end-to-end flow with spaces in every path (T12)
- build: atomic hx.js write so parallel builds never tear the bundle
- docs: events contract, roadmap and backlog (T11)
- chore: scaffold harness repo, plugin and marketplace manifests (T01)
