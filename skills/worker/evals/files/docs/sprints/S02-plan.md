# Sprint S02 — Tarefas e pedidos

## Objetivo

Ler a tabela de tarefas do plano e criar pedidos no inbox pelo `hx`.

## Critérios de aceite

- `hx task list` mostra as tarefas do plano, ignorando linhas vazias.
- `hx request --title --need --why --priority` grava `inbox/AAAA-MM-DD-<projeto>-<slug>.md`.
- Lint e tipos: zero erros e zero avisos (`npm run check`).

## Tarefas

| Id | Tarefa | Agente | Arquivos | Estimativa |
|---|---|---|---|---|
| T04 | Parser da tabela de tarefas (linha vazia não quebra) | tech-lead | cli/src/sprint/tasks.ts, cli/test/tasks.test.ts | 30 min |
| T05 | Comando `hx request` (flags obrigatórias; `--priority` alta/média/baixa; slug do título) | clone | cli/src/commands/request.ts, cli/test/request.test.ts | 40 min |
| T06 | Revisão do reviewer | reviewer | — | 20 min |
| T07 | Seção de uso do `hx request` no README | a definir | README.md | 10 min |
| T08 | `pre-bash` bloqueia `git clean -fdx` | a definir | cli/src/hooks/pre-bash.ts, cli/test/pre-bash.test.ts | 20 min |
