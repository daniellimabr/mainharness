# ADR 0019 — `state.json` por projeto e extensão do VS Code no mesmo repo

- **Status:** substituído (S19): o `state.json`, o `hx state`, o `HARNESS_DASHBOARD` e a extensão foram removidos. O texto abaixo é histórico. Antes: proposto (S18)
- **Data:** 2026-11-20
- **Harness:** 0.16.0

## Contexto

Daniel decidiu juntar o Dashboard IA e o harness num projeto só (2026-11-20). O dashboard atual é um servidor Node com SQLite e React que relê eventos e transcrições. O plano antigo (S16 do Dashboard IA) previa que a extensão do VS Code reimplementasse dois leitores (eventos e custo). O pedido do Dashboard (inbox, prioridade alta) pede papel e tarefa nos eventos e um estado pequeno por projeto.

## O que a documentação diz

- O `hx` já grava um evento `usage` com `usd` por resposta e `sprint.metrics` com `usd_by_task` (`docs/contracts/events.md`). A parte de papel e tarefa (agente `executor`/`main-harness:reviewer`, `agent.start` com TNN) saiu na S17, v0.16.0.
- `emit()` ([cli/src/events/emit.ts](../../cli/src/events/emit.ts)) é o único ponto de escrita de evento.
- `~/.harness/projects.json` lista os projetos (id, caminho). O plugin roda de `C:\harness-stable`, que só o `hx release` move; todos os projetos recebem o `hx` novo no mesmo release.

## Alternativas

1. **Extensão com leitores próprios** (plano antigo): relê todo o histórico, duplica a lógica do `hx` e do dashboard; mais código e mais leitura em cada janela.
2. **Extensão importa o código do `hx`** (`readEvents`, `computeMetrics`) e relê eventos: sem duplicar, mas ainda relê tudo em cada janela.
3. **O `hx` grava `state.json` por projeto e a extensão só o lê (escolhida):** a extensão fica fina; o custo de agregar fica onde os dados nascem.

## Decisão

1. **Arquivo:** `~/.harness/dashboard/<id-do-projeto>.json` (a pasta `state/` já guarda o estado de runtime do `hx`; ajuste da S18/T02), central (nada dentro dos repos, funciona com a janela fechada). Contrato em `docs/contracts/state.md` (removido na S19), com campo `v`.
2. **Conteúdo:** projeto, sprint ativa, tarefas (status, agente do plano, papel, fase, custo), agentes ativos (id, papel, tarefa, início), sprints com situação e custo, gasto por dia e total, `updated_at`.
3. **Quem escreve:** uma função pura `buildState` recalcula o arquivo inteiro a partir dos eventos e do plano; é chamada em `emit()` para eventos de ciclo (tarefa, revisão, sprint, agente) e uma vez por lote depois de ingerir `usage`. Recalcular tudo (e não aplicar diferença) torna a corrida entre hooks inofensiva: o último a escrever também leu tudo. Gravação atômica (arquivo temporário e `rename`). `HARNESS_DASHBOARD=off` não grava.
4. **`hx state rebuild [--all]`** reconstrói o histórico dos eventos existentes (um projeto ou todos do registro).
5. **Papel:** derivado do `agent` do envelope (`executor` → clone, `main-harness:reviewer` → reviewer, o resto → tech-lead).
6. **Extensão:** pasta `extension/` neste repo, TypeScript com esbuild, sem React; lê só `projects.json` e `dashboard/*.json`, observa a pasta, sem porta. Distribuída como `.vsix` à parte (a pasta `extension/` segue no clone do plugin, sem efeito).
7. **Custo vem dos eventos `usage`**, não das transcrições. A conferência com o dashboard atual (até 1%) decide se isso basta.

## Consequências

- Some o trabalho de dois leitores; a extensão fica pequena e leve (R9).
- O estado só nasce depois do `hx release` desta sprint; antes disso, "sem dado" (R10). `hx state rebuild` cobre o histórico dos eventos, não o anterior a eles.
- `buildState` roda a cada evento de ciclo (centenas por dia): precisa ler só a sprint ativa e o total acumulado em cache no próprio estado; a T01 mede e o teste de desempenho fica com o Reviewer.
- Mudar o formato exige subir `v` e atualizar o contrato.
