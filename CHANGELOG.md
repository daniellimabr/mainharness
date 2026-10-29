# Changelog

Versões do Main Harness (versionamento semântico; `0.y.z` até a 1.0).

## [0.11.0] - 2026-10-29

### Novidades

- feat(S13/T07): attention and error events from async hooks
- feat(S13/T04): hx task drop/defer
- feat(S13/T06): task on agent.start, agent_id on alert.context, context event per Stop
- feat(S13/T08): cost per task and per executor in metrics
- feat(S13/T10): session-start after compact shows the task in progress
- feat(S13/T05): post-edit prunes stale lines from index.md
- feat(S13/T01): remove Gemini worker (hx worker, skill, config, guide)

### Correções

- fix(S13/T03): task done/phase on a finished task only warns
- fix(S13/T02): no duplicate usage events on re-ingest without cache

### Outros

- docs(S13): release table update
- docs(S13/T11): backlog, roadmap, contract and index cleanup
- docs(S13/T09): golden rule, decision profile, better handoff, waves format
- docs(S13): sprint plan
- chore(inbox): move 10 requests to backlog
- docs(S12): release report and harness requests
- chore(harness): migrate to v0.10.2

## [0.10.2] - 2026-10-29

### Novidades

- feat(S12/T05): failure report for dead worker, status warns (B105), winner of challenge 2
- feat(S12/T04): write worker lock before spawn (B099), winner of challenge 1
- feat(S12/T02): bench.mjs and experiment protocol
- feat(S12/T09): sync autoCompactWindow with contextLimit in all projects

### Correções

- fix(S12/T08): count each usage message_id once

### Outros

- chore(S12): inbox requests and docs from the sprint
- docs(S12/T07): roadmap typo
- docs(S12/T07): fix review findings (roadmap, ADR 0014 wording, statuses)
- docs(S12/T07): ADR 0014 - Haiku replaces Gemini, Reviewer Sonnet/Opus by risk
- docs(S12/T07): backlog, ADR 0006 note (140k), roadmap
- docs(S12/T06): experiment report (models, cost per role, reviewers, baseline)
- docs(S12/T02): protocol acceptance command
- test(S12/T02): acceptance runs only worker-run tests
- docs(S12/T03): experiment challenges, acceptance and hidden tests
- docs(S12/T10): Reviewer always Opus, drop cd in tech-lead
- test(S12/T01): stabilize Windows tests (eval timeout, rm retries)
- docs(S12): add prompt-audit fixes (T10) to sprint plan
- docs(S12): sprint plan approved
- chore(inbox): move 3 requests to backlog
- chore(S11): index
- docs(S11): release report and harness requests
- chore(harness): migrate to v0.10.1

## [0.10.1] - 2026-10-28

### Correções

- fix(S11/T02): sprint-run stops on the first reply when not on Sonnet
- fix(S11/T02): Opus is the default chat model; Sonnet picked for sprint-run

### Outros

- chore(S11): execution table after feedback
- chore(harness): migrate to v0.10.0

## [0.10.0] - 2026-10-28

### Novidades

- feat(S11/T07): task done/phase refresh an auto section of the session handoff
- feat(S11/T03): lean executor persona with phases; worker runs --agent executor
- feat(S11/T08): hx eval sandbox runs the repo hx bundle
- feat(S11/T05): cost and tokens per model in sprint.metrics and hx metrics
- feat(S11/T09): hx request --to <project> and session-start inbox notice
- feat(S11/T06): context alert at 120k tokens by default
- feat(S11/T02): Sonnet as default execution model, Opus check in plan/run

### Correções

- fix(S11/T04): worker skill falls back to a clone without asking

### Outros

- docs(S11/T10): backlog, roadmap and execution table for v0.10.0
- refactor(S11/T04): remove the 90% usage trigger; add lint phase
- docs(S11/T01): ADR 0013 model per role and tech-lead rule
- docs(S11): sprint plan
- chore(inbox): move 2 requests to backlog
- chore(harness): migrate to v0.9.0
- chore(S10): index update
- docs(S10): release report

## [0.9.0] - 2026-10-27

### Novidades

- feat(S10/T07): delegation rule, usage-threshold nudge (Stop + hx task) and worker skill
- feat(S10/T06): hx worker run TNN <handoff> runs a detached Gemini worker via OmniRoute
- feat(S10/T05): hx usage shows non-Claude models on their own line, outside the Claude total
- feat(S10/T04): hx worker status for Gemini workers via OmniRoute; never writes settings.json

### Correções

- fix(S10/T06): worker passes --model so the tech-lead agent's pinned Claude id doesn't reach OmniRoute

### Outros

- chore(S10/T09): sprint execution table
- docs(S10/T09): backlog B095-B100 (first real Gemini worker delegation)
- docs(S10/T08): final ADR 0012 (Gemini workers), OmniRoute guide and roadmap
- docs(S10): revised plan approved (Gemini workers, no settings.json changes)
- docs(S10/T01): ADR 0012 draft with the OmniRoute/Gemini spike result
- refactor(S10/T03): remove scheduled resume after usage limit; v0.9.0 migration deletes leftover tasks
- docs(S10/T02): call clones with model sonnet by default, opus for complex tasks
- docs(S10): sprint plan approved
- chore(inbox): move 17 requests to backlog
- chore(harness): migrate to v0.8.2
- docs(S09): release report and harness request

## [0.8.2] - 2026-10-22

### Novidades

- feat(S09/T03): align frontend-design with upstream 41bbe19

### Correções

- fix(S09/T02): migrate refreshes catalog skills already in the project
- fix(S09/T01): retry atomic rename on transient Windows locks

### Outros

- chore(S09/T05): sprint execution table and new inbox requests
- docs(S09/T04): reviewer skips mobile check on UI tasks
- docs(S09/T05): backlog B073-B077
- docs(S09/T04): UI tasks call frontend-design and reviewer checks the plan
- chore(harness): migrate to v0.8.1
- docs(S08): release report

## [0.8.1] - 2026-10-22

### Novidades

- feat(S08/T03): auto mode rule allows hx release/rollback only on explicit user request
- feat(S08/T02): warn about non-conventional commits before the changelog

### Correções

- fix(S08/T05): hx setup drops every older auto mode rule; backlog B069-B072 done
- fix(S08/T01): retry the eval judge only for runs without a verdict

### Outros

- chore(S08/T05): sprint execution table and new inbox request
- docs(S08/T04): task commit format and router step at wave start
- docs(S08): sprint plan
- chore(inbox): move 4 requests to backlog
- chore(harness): migrate to v0.8.0
- chore: update index
- docs(S07): release report and harness requests
- docs(changelog): group S07 commits for v0.8.0

## [0.8.0] - 2026-10-21

### Novidades

- feat(resume): auto-resume the chat after the usage limit (B005)
- feat(usage): plan usage % from the OAuth usage endpoint (usage.limits) (B064)
- feat(sprint): queue (fila) and review shown apart in task time (B068)
- feat(skills): tsc in clone handoff; sprint-plan sum factor from review-phase sprints (B066, B067)

### Outros

- refactor: remove hx statusline; move safeText to core/text (B065, B063)
- docs(backlog): S07 items done (B005, B063-B068)
- docs(sprint): S07 plan approved
- chore(inbox): move 4 requests to backlog
- chore(harness): migrate to v0.7.0
- docs(S06): release report, harness requests and B064

## [0.7.0] - 2026-10-21

### Novidades

- feat(sprint): task duration until clone delivery, review time apart (B060)
- feat(statusline): hx statusline records rate-limit % and chat title; setup and doctor (B056)
- feat(eval): strip harness env vars and warn on cases missing fixtures (B059, B061)

### Correções

- fix(status,session-start): accept ; in hx status and keep escaped pipes in backlog items (B057, B058)
- fix(usage): rewind cursor to first streaming part across user lines; stable timing tests (B055, B062)
- fix(pre-bash): treat Tee-Object and format-patch -o to protected paths as writes (B054)

### Outros

- docs(T08): backlog S06 done and follow-up B063
- test(tdd-workflow): eval fixtures, stronger trigger and commit fallback (B061, T06)
- docs(sprint): plan S06
- chore(inbox): move 3 requests to backlog
- chore(harness): migrate to v0.6.0
- chore: update index
- docs: S05 release report and harness requests

## [0.6.0] - 2026-10-21

### Novidades

- feat(metrics): wait for Daniel apart from work time (T06)
- feat(session-start): show the project's done harness requests once (T09)
- feat(setup): write hx auto mode rule to user settings; doctor checks it (T04)
- feat(release): run claude plugin validate before publishing (T08)
- feat(events): agent, prompt, project.status events and chat title; Stop typecheck only in harness repo (T01)

### Correções

- fix(sprint): reopened task sums its passes (T05)
- fix(pre-bash): treat --output= and redirections to protected paths as writes (T03)
- fix(usage): record final output_tokens per message id (T02)

### Outros

- docs(T11): release-report eval fixtures, backlog S05 done and follow-ups
- test(sprint-plan): eval results (T10)
- docs(sprint-plan): clock forecast by critical path and no wave-review task (T07)
- docs(sprint): S05 plan approved
- chore(inbox): move 5 requests to backlog
- chore(harness): migrate to v0.5.0
- chore(index): S04 docs
- docs: S04 release report

## [0.5.0] - 2026-10-19

### Outros

- docs(T11): backlog B045-B048, S04 execution list
- docs(T11): backlog S04 done; B044 auto mode blocks hx
- chore(T09): allow read-only commands in project permissions (B027)
- T10: real eval runs for handoff and sprint-plan; judge sees subagent prompts
- T08: calibrated estimates in sprint-plan (B039)
- T07: file-tool rule in agent prompts and handoff (B041, B042)
- T04: sprint timing without pauses, time to review, feedback rounds, forecast end (B035, B037, B040, B043)
- T06: repomap drops duplicate index.md entries (B025)
- T05: hx eval --failed reruns only failed cases and queries (B036)
- T03: Stop runs typecheck when cli/src changed (B026)
- T02: pre-edit hook blocks edits to cli/dist/hx.js and harness-stable (B023)
- T01: pre-bash denies cd to /c/ paths and asks on commit with stale bundle (B041, B024, B042)
- docs(sprint): plan and approve S04
- chore(inbox): move 12 requests to backlog
- chore(harness): migrate to v0.4.0
- docs: S03 release report and harness requests

## [0.4.0] - 2026-10-16

### Novidades

- feat(setup): turn ponytail band off and set user HOME on Windows; doctor warns (S03/T01, B020)
- feat(skills): frontend-design back in optional catalog; visual plan before code (S03/T05, B007)
- feat(sprint): close shows task wall time and wait apart (S03/T02, B021)

### Correções

- fix(eval): judge sees all run text and records loaded skills; frontend-design evals pass (S03/T07)
- fix(run): uppercase drive letter in child cwd so vitest loads once (S03/T03, B019)

### Outros

- docs: S03 task list snapshot
- docs: S03 sprint plan (approved)
- docs: backlog S03 items done; B030 validate request cycle with the Dashboard (S03/T08)
- docs: backlog items from claude-code-setup audit (S03/T06, B002)
- docs: native task list only when the tool exists (S03/T04, B022)
- chore(inbox): move 4 requests to backlog
- chore(index): new inbox requests
- docs(sprint): S02 release report and 4 harness requests
- chore(sprint): S02 execution list with T09 done and planned wall clock
- chore(harness): migrate to v0.3.0

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
