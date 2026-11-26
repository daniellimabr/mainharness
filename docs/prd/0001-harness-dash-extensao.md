# PRD 0001 — Harness Dash: painel do harness dentro do VS Code

- **Projeto:** main-harness (veio do Dashboard IA, 2026-11-20)
- **Data:** 2026-11-20
- **Status:** substituído (S19): a extensão e o `state.json` foram removidos. O texto abaixo é histórico. Antes: aprovado junto com a S18
- **Origem:** `docs/entrada-dashboard-ia/prd-0001-harness-dash-extensao.md` (renumerado; leitor próprio de eventos e de transcrição trocado pelo `state.json`, ADR 0019)

## Problema

Daniel trabalha com várias janelas do VS Code, cada uma com um projeto que usa o harness. O dashboard atual exige um servidor Node rodando, abre no navegador e é preciso lembrar de iniciá-lo. Não há um lugar único, dentro do editor, para ver gasto, sprints e quem está trabalhando em cada projeto.

## Usuários

- **Daniel**, que dirige vários projetos ao mesmo tempo e quer ver gasto em US$ e andamento sem sair do VS Code.

## Objetivo e métricas

Ver todos os projetos com harness, de qualquer janela, sem iniciar nada à mão.

- Abrir o painel em 1 comando e ver dados em menos de 3 s (medido na máquina de Daniel).
- Zero processos externos para manter rodando.
- O gasto total do painel bate com o dashboard atual (diferença de até 1%) na mesma data.
- Depois disso, o repo Dashboard IA é arquivado (sem apagar).

## Escopo

- **Harness:** o `hx` grava um `state.json` pequeno por projeto (ADR 0019) para o painel ler sem reprocessar histórico.
- **Extensão** do VS Code (`extension/`), instalável por `.vsix`.
- Painel: projetos com harness, gasto total e por projeto em US$, sprints com custo, tarefas da sprint ativa com status e papel (tech-lead, clone, reviewer), agentes ativos.
- Barra de status: gasto do dia e número de agentes ativos.
- Atualização automática quando o estado muda.
- Projeto sem atividade recente aparece como "parado", com o último gasto conhecido.

## Fora de escopo

- Backlog, Docs, Timeline, Roadmap e Chats do dashboard atual.
- Publicar na loja do VS Code; editar sprint ou tarefa pelo painel (só leitura).

## Requisitos

1. **R1:** um comando abre o painel dentro do VS Code.
2. **R2:** lista todos os projetos do registro do harness (`~/.harness/projects.json`), mesmo os de outras janelas.
3. **R3:** gasto total em US$ e o de cada projeto.
4. **R4:** ao escolher um projeto, suas sprints com situação, tarefas feitas/total e custo.
5. **R5:** tarefas da sprint ativa com status (a fazer, em andamento, em revisão, feita, reprovada), quem executa e o papel.
6. **R6:** agentes ativos agora, com a tarefa em que estão.
7. **R7:** barra de status com gasto do dia e agentes ativos.
8. **R8:** o painel se atualiza sozinho quando o harness grava estado novo.
9. **R9:** sem servidor, banco ou porta aberta.
10. **R10:** dado ausente aparece como "sem dado", nunca como zero.

## Critérios de aceite

1. Com a extensão instalada, "Abrir Harness Dash" abre o painel com os projetos.
2. Dois projetos com estado gravado aparecem em qualquer janela.
3. Na mesma data, o gasto total difere em no máximo 1% do dashboard atual.
4. Agente com tarefa iniciada e não concluída aparece em "agentes ativos" e na barra de status, com o papel certo.
5. Evento novo gravado pelo harness muda o painel em até 5 s, sem recarregar.
6. Projeto sem atividade recente aparece "parado" com o último gasto.
7. Nenhum processo escutando em porta; funciona com o servidor atual desligado.
8. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Riscos e dúvidas

- **Histórico anterior ao `state.json`:** o gasto antigo só entra se o `hx state rebuild` reconstruir dos eventos; transcrições de antes dos eventos não entram e podem estourar o 1%. Redução: conferir na T07; se passar de 1%, decide Daniel entre aceitar a diferença (data de corte) ou ler também as transcrições.
- **Agente "travado"** aparece ativo. Regra inicial: ativo se iniciou e não terminou nos últimos 30 min. Decide: Daniel, depois de usar.
- **Formato do estado muda** com versões do harness. Redução: campo `v`; a extensão ignora campo desconhecido e avisa.
- **Projeto em versão antiga do plugin** não grava estado até o próximo `hx release` chegar ao `harness-stable`. Aparece "sem dado".
