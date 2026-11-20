# S16 — Harness Dash: extensão do VS Code sem servidor

- **Projeto:** dashboard-ia
- **Versão do harness:** 0.16.0
- **Status:** substituída (2026-11-20): dashboard e harness viram um projeto só, no repo do Main Harness. Não executar aqui. Plano e PRD seguem como base do replanejamento.

## Objetivo

Daniel recebe uma extensão do VS Code (arquivo `.vsix`) com um painel que mostra todos os projetos com harness, de qualquer janela: gasto em US$, sprints com custo, tarefas da sprint ativa com status e agentes ativos, mais uma barra de status. Sem servidor Node, sem banco. PRD: `docs/prd/0001-harness-dash-extensao.md`.

## Decisões de Daniel (2026-11-20)

- Reconstruir do zero como extensão; o dashboard atual (servidor + React) fica como está e é a referência de conferência dos números.
- Etapa 1 lê o que o harness já grava (`~/.harness/events` e `~/.claude/projects`). Mudanças no harness só na etapa 2, depois do uso (registrado em `docs/decisoes-daniel.md`).
- A maquete aprovada como ponto de partida: https://claude.ai/artifact/Keg2EktwjnRizimie2dcV9. Evolui conforme o uso.

## Escopo

1. **Extensão (T01):** pasta `extension/` no repo, TypeScript empacotado com esbuild, comando "Abrir Harness Dash". Sem React: a tela do painel é HTML e TypeScript simples. ADR curto com a escolha.
2. **Leitor de eventos (T02):** lê `~/.harness/events/*.jsonl` e produz projetos, sprints, tarefas com status, agentes e atividade. Leitura incremental (guarda até onde leu cada arquivo). Lógica portada de `server/events.ts` e `server/data.ts`, sem SQLite.
3. **Leitor de custo (T03):** lê as transcrições de `~/.claude/projects`, soma tokens por tipo e modelo e converte em US$ com a tabela de preços atual (`server/usage.ts`). Leitura incremental. Atribui custo a projeto, sprint e dia.
4. **Store (T04):** junta T02 e T03 num estado único, observa as pastas e avisa quando muda (com pequeno atraso para juntar rajadas).
5. **Painel (T05):** projetos, KPIs de gasto, sprints com custo, tarefas com status, agentes ativos, projeto "parado". Tema do VS Code. Visual conforme a maquete.
6. **Barra de status (T06):** gasto do dia e agentes ativos; clicar abre o painel.
7. **Empacotar e conferir (T07):** gerar o `.vsix`, README curto de instalação, conferir o total contra o dashboard atual (diferença até 1%).

## Fora de escopo

- Backlog, Docs, Timeline, Roadmap e Chats do dashboard atual.
- Mudanças no harness (etapa 2). Por isso, enquanto o pedido "registrar clone/Reviewer nos eventos" não for atendido, os agentes aparecem como o harness os grava (clones como `tech-lead`).
- Publicar na loja, editar sprint ou tarefa pelo painel.
- Desligar ou apagar o servidor atual.

## Critérios de aceite

1. Com a extensão instalada, o comando "Abrir Harness Dash" abre o painel com os projetos (R1, R2).
2. O gasto total e por projeto aparece em US$; na mesma data difere no máximo 1% do dashboard atual (R3).
3. Ao escolher um projeto, aparecem suas sprints (situação, feitas/total, custo) e as tarefas da sprint ativa com status e quem executa (R4, R5).
4. Agente com tarefa iniciada e não concluída aparece em "agentes ativos" e na barra de status (R6, R7).
5. Evento novo gravado pelo harness atualiza o painel em até 5 s, sem recarregar (R8).
6. Projeto sem eventos recentes aparece "parado" com o último gasto; dado ausente aparece "sem dado", nunca zero (R10).
7. Nenhuma porta aberta; funciona com o servidor atual desligado (R9).
8. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T02:** teste com arquivos `.jsonl` de exemplo: dois projetos; tarefa que reabre por reprovação; `task.start` sem `task.done` (ativo); linha corrompida e campo desconhecido (ignorados com aviso); leitura incremental (segunda leitura só vê o que foi acrescentado).
- **T03:** transcrição de exemplo com 2 modelos: soma por tipo, US$ por modelo; linha corrompida; modelo sem preço ("sem dado", não zero); leitura incremental.
- **T04:** muda um arquivo e o estado notifica uma vez; pasta inexistente não quebra.
- **T05/T06:** funções puras de formatação e de montagem da tela testadas (US$ em pt-BR, status, "parado"); a webview em si é conferida à mão.
- **T07 (Daniel):** instalar o `.vsix`, abrir o painel em duas janelas e conferir o total contra o dashboard atual.

## Tarefas

| Id  | Tarefa                                              | Agente         | Arquivos                                                                                                                                                                 | Depende de | Bruta   | Planejado |
| --- | --------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------- | --------- |
| T01 | Esqueleto da extensão, comando e ADR                | clone (sonnet) | `extension/package.json`, `extension/tsconfig.json`, `extension/esbuild.mjs`, `extension/src/extension.ts`, `extension/src/types.ts`, `docs/adr/0003-extensao-vscode.md` | —          | 40 min  | 16 min    |
| T02 | Leitor de eventos (projetos, sprints, tarefas)      | clone (sonnet) | `extension/src/reader/events.ts`, `extension/src/reader/events.test.ts`                                                                                                  | T01        | 150 min | 60 min    |
| T03 | Leitor de custo (transcrições → US$)                | clone (sonnet) | `extension/src/reader/usage.ts`, `extension/src/reader/usage.test.ts`                                                                                                    | T01        | 120 min | 48 min    |
| T04 | Store: junta leitores, observa pastas e notifica    | clone (sonnet) | `extension/src/store.ts`, `extension/src/store.test.ts`                                                                                                                  | T02, T03   | 90 min  | 36 min    |
| T05 | Painel (webview) conforme a maquete                 | clone (sonnet) | `extension/src/panel.ts`, `extension/src/panel.test.ts`, `extension/media/panel.js`, `extension/media/panel.css`                                                         | T04        | 150 min | 60 min    |
| T06 | Barra de status                                     | clone (sonnet) | `extension/src/statusBar.ts`, `extension/src/statusBar.test.ts`                                                                                                          | T04        | 40 min  | 16 min    |
| T07 | Empacotar `.vsix`, README e conferência dos números | clone (sonnet) | `extension/README.md`, `extension/.vscodeignore`, `index.md`, `CHANGELOG.md`                                                                                             | T05, T06   | 60 min  | 24 min    |

**Ondas:** onda 1 = T01; onda 2 = T02, T03; onda 3 = T04; onda 4 = T05, T06; onda 5 = T07

T05 (tela nova) usa a skill `frontend-design` e traz o plano visual na entrega. Nas tarefas T02 e T03 o handoff lista os casos de erro (linha corrompida, arquivo sumido, preço ausente). O Reviewer revisa por onda.

**Histórico (hx metrics):** nas três últimas sprints (S13–S15) o tempo real ficou entre 18% e 31% do planejado. Fator usado: planejado = 40% da bruta; relógio ≈ 30% do planejado.

**Total estimado:** 650 min brutos, 260 min planejados. Caminho mais longo (T01 → T02 → T04 → T05 → T07): 490 min brutos, 196 min planejados; relógio ≈ 1 h de agente, mais a espera pelo teste e ajustes de Daniel.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-11-20 16:15:22 (horário de Brasília) — UTC 2026-11-20T19:15:22Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `6665f2e6722b408ce9ea126bdebb9c5fb91edfec6c52275ad632f46f7b7210c9`
- **Versão do harness:** 0.16.0
