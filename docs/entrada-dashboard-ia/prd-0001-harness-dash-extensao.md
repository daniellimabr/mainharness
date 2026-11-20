# PRD — Harness Dash: painel do harness dentro do VS Code

- **Projeto:** dashboard-ia
- **Data:** 2026-11-20
- **Status:** rascunho (aprovado junto com o S16)

## Problema

Daniel trabalha com várias janelas do VS Code, cada uma com um projeto que usa o harness. Hoje o dashboard exige um servidor Node rodando, abre no navegador e é preciso lembrar de iniciá-lo. Não há um lugar único, dentro do editor, para ver o gasto, as sprints e quem está trabalhando em cada projeto.

## Usuários

- **Daniel**, que dirige vários projetos ao mesmo tempo e quer ver gasto em US$ e andamento sem sair do VS Code.

## Objetivo e métricas

Ver todos os projetos com harness, de qualquer janela, sem iniciar nada à mão.

- Abrir o painel em até 1 comando e ver dados em menos de 3 s (medido na máquina de Daniel).
- Zero processos externos para manter rodando.
- O gasto total do painel bate com o dashboard atual (diferença de até 1%) na mesma data.

## Escopo

- Extensão do VS Code instalável por arquivo `.vsix`.
- Painel com: projetos com harness, gasto total e por projeto em US$, lista de sprints com custo, tarefas da sprint ativa com status, agentes ativos.
- Barra de status: gasto do dia e número de agentes ativos.
- Atualização automática quando os dados mudam.
- Projeto cuja janela está fechada aparece como "parado", com o último gasto conhecido.

## Fora de escopo

- Backlog, Docs, Timeline, Roadmap e Chats do dashboard atual.
- Mudanças no harness (ficam para a etapa 2, a partir do uso).
- Publicar na loja do VS Code.
- Editar sprint ou tarefa pelo painel (só leitura).

## Requisitos

1. **R1:** um comando abre o painel dentro do VS Code.
2. **R2:** o painel lista todos os projetos que têm registro no harness, mesmo os de outras janelas.
3. **R3:** mostra o gasto total em US$ e o gasto de cada projeto.
4. **R4:** ao escolher um projeto, mostra suas sprints com situação, tarefas feitas/total e custo.
5. **R5:** mostra as tarefas da sprint ativa com status (a fazer, em andamento, em revisão, feita, reprovada) e quem executa.
6. **R6:** mostra os agentes ativos agora, com a tarefa em que estão.
7. **R7:** a barra de status mostra gasto do dia e agentes ativos.
8. **R8:** o painel se atualiza sozinho quando o harness grava dados novos.
9. **R9:** não depende de servidor, banco ou porta aberta.
10. **R10:** dado ausente aparece como "sem dado", nunca como zero.

## Critérios de aceite

1. Dado o VS Code com a extensão instalada, quando rodo "Abrir Harness Dash", então o painel abre com os projetos.
2. Dado dois projetos com eventos, quando abro o painel em qualquer janela, então os dois aparecem.
3. Dado a mesma data, o gasto total do painel difere em no máximo 1% do dashboard atual.
4. Dado um agente com tarefa iniciada e não concluída, então aparece em "agentes ativos" e na barra de status.
5. Dado um evento novo gravado pelo harness, então o painel muda em até 5 s sem recarregar.
6. Dado um projeto sem eventos recentes, então aparece "parado" com o último gasto.
7. Nenhum processo Node fica escutando em porta; o painel funciona com o servidor atual desligado.
8. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Riscos e dúvidas

- **Leitura de transcrições pesada** com histórico grande. Redução: leitura incremental (guarda até onde leu) e, na etapa 2, custo por tarefa gravado pelo harness. Decide: Tech Lead, com Daniel se piorar.
- **Agente "travado"** pode aparecer ativo. Regra inicial: ativo se iniciou e não terminou nos últimos 30 min. Decide: Daniel, depois de usar.
- **Formato dos eventos** pode mudar com versões do harness. Redução: a extensão ignora campo desconhecido e mostra aviso. Decide: Tech Lead.
- **Mostrar o painel em todas as janelas** sem duplicar leitura. Redução: cada janela lê por conta própria (arquivos pequenos). Decide: Tech Lead.
