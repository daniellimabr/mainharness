# S01 — Release Report

> Sprint em andamento. A tabela de execução abaixo é atualizada pelo `hx` a cada tarefa; o Tech Lead completa o restante no fechamento (skill release-report), mantendo esta tabela.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | `hx eval <skill>/--changed` (B006): runner de evals com `claude -p --model sonnet --output-format json`, 1 rodada, paralelismo máx. 3, sandbox temporário; escopo pela mudança desde a última tag; grava `trigger-results.json`/`results.json`; emite eventos `usage`; gate de release ajustado | 1 h | 00:41 | 00:55 | 14 min |
| ✅ | T02 | Enxugar `trigger.json` de 16 para 8 consultas (4 acionam, 4 não; as mais discriminantes) | clone B | 15 min | 00:41 | 00:55 | 14 min |
| ✅ | T03 | Reviewer no Sonnet; override Opus em segurança; limite de 2 reprovações; revisão por onda, re-revisão continuando o mesmo Reviewer, sem repetir lint/testes; critério do pre-bash (acidente, não ataque); **remover o Writer** (apagar o agente e passar as escritas ao Tech Lead em agentes, comandos, skill e textos) | clone C | 35 min | 00:41 | 00:55 | 14 min |
| ✅ | T04 | Plugins companheiros: `PLUGINS` em `setup.ts`; `hx release` atualiza todos em cada projeto; `hx doctor` avisa faltando ou desatualizado | clone D | 30 min | 00:41 | 00:55 | 14 min |
| ✅ | T05 | B004 (Ponytail): remover duplicações — wrappers de git em 4 lugares (`cli/src/release/git.ts` fica), `runTool` × `runFixed`, `ESLINT_CONFIGS` repetido | tech-lead | 30 min | 00:55 | 01:06 | 11 min |
| ✅ | T06 | B008: saída UTF-8 do `hx` no PowerShell 5.1 | tech-lead | 15 min | 01:03 | 01:07 | 5 min |
| ✅ | T07 | ADR 0009, seção "Como rodar evals" no `CLAUDE.md`, backlog (B006, B004, B008 → planejado (S01); novo B009 plugins companheiros → planejado (S01)) | tech-lead | 15 min | 00:41 | 00:55 | 14 min |
| ✅ | T08 | Validação real do `hx eval` em `adr` e `handoff`, mais os casos de `sprint-plan` (corpo mudou na T03, exigido pelo gate): tempo, número de sessões, custo no `hx usage` | reviewer | 20 min | 00:55 | 01:24 | 28 min |
| ✅ | T09 | Revisão final + release v0.2.0 (`hx release minor`); plugins atualizados no Dashboard IA; `hx doctor` lá sem avisos | tech-lead + reviewer | 20 min | 01:24 | 01:26 | 3 min |
| ✅ | **Total** | 9 tarefas |  | 4 h | 2026-10-16 00:41 | 2026-10-16 01:26 | 45 min |
