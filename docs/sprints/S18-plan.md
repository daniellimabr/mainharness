# S18 — Harness Dash: estado por projeto e extensão do VS Code

- **Projeto:** main-harness
- **Versão do harness:** 0.16.0
- **Status:** aguardando aprovação

## Objetivo

Daniel recebe uma extensão do VS Code (`.vsix`) com painel e barra de status que mostram todos os projetos com harness, de qualquer janela: gasto em US$, sprints com custo, tarefas da sprint ativa e agentes ativos (tech-lead, clone, reviewer). Sem servidor nem porta. Para isso o `hx` passa a gravar um `state.json` por projeto. Depois que Daniel usar, o repo Dashboard IA é arquivado. PRD: `docs/prd/0001-harness-dash-extensao.md`. Decisão: `docs/adr/0019-state-json-e-extensao-vscode.md`.

## Escopo

1. **Harness:** `buildState` (função pura) e contrato `docs/contracts/state.md`; gravação atômica em `~/.harness/state/<projeto>.json` a cada evento de ciclo e uma vez por lote de `usage`; `hx state rebuild [--all]`.
2. **Extensão** em `extension/`: esqueleto (esbuild, TypeScript, sem React), leitor do estado com observação da pasta, painel (webview) conforme a maquete (https://claude.ai/artifact/Keg2EktwjnRizimie2dcV9), barra de status, `.vsix` e README.
3. **Conferência:** total do painel contra o dashboard atual (até 1%).
4. **Descontinuar o Dashboard IA** (decisão de Daniel, 2026-11-20): depois da conferência e de alguns dias de uso, README de aviso e arquivar o repo, sem apagar.

O papel real do agente e o `agent.start` com TNN já saíram na S17; o pedido do inbox do Dashboard IA fica atendido com o `state.json`.

## Fora de escopo

- Backlog, Docs, Timeline, Roadmap e Chats do dashboard atual; loja do VS Code; editar sprint ou tarefa pelo painel.
- Ler transcrições na extensão (só se a conferência estourar 1% por causa de histórico antigo; decide Daniel).
- Apagar o servidor atual ou o repo Dashboard IA.

## Critérios de aceite

1. `hx state rebuild --all` gera o estado de cada projeto do registro; evento de ciclo novo atualiza o arquivo do projeto, sem corromper em escrita concorrente.
2. Com a extensão instalada, "Abrir Harness Dash" abre o painel com os projetos (R1, R2).
3. Gasto total e por projeto em US$; na mesma data difere no máximo 1% do dashboard atual (R3).
4. Projeto escolhido: sprints (situação, feitas/total, custo) e tarefas da sprint ativa com status, agente e papel (R4, R5).
5. Agente com tarefa iniciada e não concluída aparece em "agentes ativos" e na barra de status, com o papel certo (R6, R7).
6. Estado novo atualiza o painel em até 5 s, sem recarregar (R8).
7. Projeto parado aparece "parado" com o último gasto; dado ausente aparece "sem dado", nunca zero (R10). Nenhuma porta aberta (R9).
8. Repo Dashboard IA arquivado com README de aviso, só depois de Daniel confirmar o uso.
9. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T01:** eventos de exemplo: dois projetos; tarefa que reabre por reprovação; `agent.start` sem `agent.end` (ativo); papel por agente (`executor`, `main-harness:reviewer`, resto); `usage` somado por tarefa, dia e sprint; evento desconhecido ou linha corrompida ignorados; estado vazio (sem eventos) sem erro; custo ausente vira "sem dado".
- **T02:** escrita atômica (arquivo nunca parcial); duas escritas seguidas ficam consistentes; `HARNESS_DASHBOARD=off` não grava; `emit` não quebra se a pasta de estado não puder ser escrita (erro registrado, sem perder o evento); `usage` em lote grava uma vez.
- **T03:** `rebuild` de um projeto e `--all`; projeto do registro sem eventos; resultado igual ao gravado incrementalmente.
- **T05:** arquivo ausente, vazio, JSON quebrado e `v` desconhecido; mudança do arquivo notifica uma vez (rajada juntada); pasta inexistente não quebra.
- **T06/T07:** funções puras de formatação e de montagem (US$ em pt-BR, status, "parado", "sem dado") testadas; a webview é conferida à mão.
- **T10 (Daniel):** instalar o `.vsix`, abrir em duas janelas e conferir o total contra o dashboard atual.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Contrato `state.md` e `buildState` puro (projeto, sprint ativa, tarefas, agentes ativos, custo por tarefa/dia/sprint) | clone (sonnet) | `docs/contracts/state.md`, `cli/src/state/build.ts`, `cli/src/state/build.test.ts` | — | 120 min | 30 min |
| T02 | Gravação atômica do estado: gancho em `emit()` para eventos de ciclo, lote após `usage`, `HARNESS_DASHBOARD=off` | clone (sonnet) | `cli/src/state/write.ts`, `cli/src/state/write.test.ts`, `cli/src/events/emit.ts`, `cli/src/usage/index.ts` | T01 | 90 min | 22 min |
| T03 | `hx state rebuild [--all]` e rebuild do `cli/dist/hx.js` | clone (sonnet) | `cli/src/commands/state.ts`, `cli/src/commands/state.test.ts`, `cli/dist/hx.js` | T02 | 60 min | 15 min |
| T04 | Esqueleto da extensão: pacote, esbuild, tsconfig, tipos do estado, comando "Abrir Harness Dash", integração com `npm run check` | clone (sonnet) | `extension/package.json`, `extension/tsconfig.json`, `extension/esbuild.mjs`, `extension/src/extension.ts`, `extension/src/types.ts`, `package.json` | T01 | 40 min | 10 min |
| T05 | Leitor de estado e observador da pasta (registro + `state/*.json`, debounce) | clone (sonnet) | `extension/src/store.ts`, `extension/src/store.test.ts` | T04 | 60 min | 15 min |
| T06 | Painel (webview) conforme a maquete | clone (sonnet) | `extension/src/panel.ts`, `extension/src/panel.test.ts`, `extension/media/panel.js`, `extension/media/panel.css` | T05 | 150 min | 38 min |
| T07 | Barra de status | clone (sonnet) | `extension/src/statusBar.ts`, `extension/src/statusBar.test.ts` | T05 | 40 min | 10 min |
| T08 | Empacotar `.vsix`, README de instalação, `index.md` | clone (haiku) | `extension/README.md`, `extension/.vscodeignore`, `index.md` | T06, T07 | 60 min | 15 min |
| T09 | Revisão final, evals (`hx eval --changed`), CHANGELOG, roadmap, backlog e release v0.17.0 (Daniel roda o `hx release`) | tech-lead + reviewer | `CHANGELOG.md`, `docs/roadmap.md`, `docs/backlog.md` | T03, T08 | 60 min | 15 min |
| T10 | Conferência: `hx state rebuild --all`, total do painel contra o dashboard atual (até 1%); diferença maior volta a Daniel | tech-lead | `docs/sprints/S18-conferencia.md` | T09 | 30 min | 8 min |
| T11 | Descontinuar o Dashboard IA: README de aviso e arquivar o repo (só depois da confirmação de Daniel após alguns dias de uso) | tech-lead | `docs/entrada-dashboard-ia/LEIA-ME.md`, `docs/decisoes-daniel.md` | T10 | 30 min | 8 min |

**Ondas:** onda 1 = T01; onda 2 = T02, T04; onda 3 = T03, T05; onda 4 = T06, T07; onda 5 = T08; onda 6 = T09; onda 7 = T10; onda 8 = T11

Formato único (`onda N = Txx, Txx; onda M = ...`): quais tarefas rodam juntas. O Reviewer revisa cada onda dentro das tarefas (sem linha própria na tabela).

T06 (tela nova) usa a skill `frontend-design` (e `dataviz` nos gráficos) e traz o plano visual na entrega. Nas tarefas T02 e T05 o handoff lista os casos de erro (escrita falha, arquivo parcial, JSON quebrado). Máximo de 2 clones em paralelo nesta sprint (ADR 0018 permite 4).

**Histórico (hx metrics):** sem a tabela das últimas sprints à mão; usado o fator padrão do template (soma 0,25 e relógio 0,33). Estimativas em minutos de agente, não de dev humano.

**Total estimado:** 740 min brutos, 186 min planejados. Caminho mais longo (T01 → T04 → T05 → T06 → T08 → T09 → T10 → T11): 550 min brutos, 137 min planejados; relógio ≈ 45 min de agente. À parte: esperar o `hx release` (Daniel), o teste dele (T10) e os dias de uso antes de T11.

**Prazo:** o estado só passa a ser gravado nos outros projetos depois do `hx release` da T09 (o plugin roda de `C:\harness-stable`). A conferência da T10 só é possível depois disso.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-11-20 16:35:41 (horário de Brasília) — UTC 2026-11-20T19:35:41Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `896d56a2ee9a065a45304da73dd1e04424df7a5a4f341ebcaa3ac90ead6d9744`
- **Versão do harness:** 0.16.0
