# Changelog

Versões do Main Harness (versionamento semântico; `0.y.z` até a 1.0).

## [0.3.0] - 2026-10-16

### Novidades

- feat(sprint): planned total is the expected wall clock from task dependencies (feedback 1)
- feat(task): hx task phase shows the phase on the in-progress row (T05)
- feat(sprint-plan): estimate from the last sprints' planned, sum and wall clock (T06)
- feat(metrics): total shows planned, sum and wall clock (T04)
- feat(doctor): warn about project paths with spaces (T02)

### Correções

- fix(paths): refuse relative or drive-root HARNESS_HOME; pre-bash keeps guarding (T01)
- fix(sprint): approve hashes the plan as written when it adds the approval section

### Outros

- test(evals): real run of sprint-plan, adr and handoff cases; adr makes supersede rule explicit (T08)
- test(evals): eval cases carry product decisions, never the checked action; add fixtures (T07)
- docs(agents): [TNN] message prefix and Bash guidance for folders with spaces (T03)
- chore(sprint): re-record S02 approval with the corrected hash
- docs(sprint): plan S02 and cancel B001/B003 for now
- chore(inbox): move 8 requests to backlog
- chore(harness): migrate to v0.2.1
- chore(inbox): sprint-plan eval cases must not give the answer
- chore(inbox): message prefix request includes what and why
- chore(inbox): requests from Daniel's S01 report feedback
- docs(S01): rewrite task notes in plain language
- docs(S01): release report and harness improvement requests

## [0.2.1] - 2026-10-16

### Correções

- fix(sprint): total row in the task list; estimate column found by header

## [0.2.0] - 2026-10-16

### Novidades

- feat(plugins): release updates and doctor checks companion plugins (S01 T04)
- feat(eval): hx eval runner on Sonnet with change-based scope and gate (S01 T01)
- feat(agents): reviewer on Sonnet with Opus override, drop the Writer (S01 T03)

### Outros

- T09: pre-release cleanup (index, events example, backlog status)
- T08: validate hx eval for real; fix case runner and add fixtures
- docs: B008 findings, handoff via Bash heredoc (S01 T06)
- refactor: single git wrapper, runTool and eslint config pattern (S01 T05)
- docs: ADR 0009, how to run evals, backlog for S01 (S01 T07)
- test(skills): trim trigger evals to 8 queries (4/4) (S01 T02)
- docs: S01 sprint plan (approved)
- chore(harness): migrate to v0.1.3
- docs: S00 release report and backlog updates

## [0.1.3] - 2026-10-15

### Correções

- fix(release): update the plugin in every attached project

### Outros

- chore(harness): migrate to v0.1.2

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
