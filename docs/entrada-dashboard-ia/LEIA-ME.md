# Levar para o repo do Main Harness (2026-11-20)

Decisão: dashboard (extensão do VS Code) e harness viram um projeto só, em `C:\Main Harness`, extensão em `extension/`.

## O que levar
- `docs/prd/0001-harness-dash-extensao.md` — requisitos R1–R10 e 8 critérios de aceite (gasto até 1% do dashboard atual, atualização em até 5 s, sem porta aberta, lint zero).
- `docs/sprints/S16-plan.md` — 7 tarefas (esqueleto+ADR, leitor de eventos, leitor de custo, store, painel, barra de status, `.vsix`+README); ondas 1/2/3/4/5; 260 min planejados. Base do replanejamento.
- Maquete: https://claude.ai/artifact/Keg2EktwjnRizimie2dcV9
- Pedido já no inbox do harness: `inbox/2026-11-20-dashboard-ia-eventos-de-agente-com-papel-tech-lead-clone-reviewer-e-taref.md` (papel e tarefa em todo evento; `agent.start`/`agent.end`; `estado.json` por projeto).
- `docs/decisoes-daniel.md`, entradas de 2026-11-20.

## Como replanejar
1. Parte A (harness): papel real do agente, agente ativo explícito, `estado.json` por projeto, custo por tarefa ao fechar.
2. Parte B (extensão): lê o formato novo; descartar o leitor dos eventos antigos (T02/T03 mudam).
3. Conferir como o Main Harness organiza sprints e como `C:\harness-stable` é atualizado antes de prometer prazo.
4. Nova aprovação de Daniel lá. Fora de escopo mantido: Backlog, Docs, Timeline, Roadmap, Chats, loja.

## Atenção
Os arquivos desta pasta vêm do repo Dashboard IA. O plano chama-se S16 lá, mas aqui a S16 e a S17 já existem: renumerar ao replanejar. O PRD é 0001 lá; ajustar ao número livre daqui.

## Descontinuar o Dashboard IA (decisão de Daniel, 2026-11-20)
O plano novo precisa ter uma tarefa final: depois que a extensão bater com o dashboard atual (até 1
## Descontinuar o Dashboard IA (decisão de Daniel, 2026-11-20)
O plano novo precisa ter uma tarefa final: depois que a extensão bater com o dashboard atual (até 1% de diferença) e Daniel usar por alguns dias, arquivar o repo Dashboard IA (README de aviso, sem apagar). Isso NÃO estava no plano S16 antigo.


## Status (2026-11-20)
Replanejado como S18: docs/sprints/S18-plan.md (PRD 0001, ADR 0019).
