---
name: release-report
description: "Fecha a sprint e escreve o Release Report docs/sprints/SNN-release.md com indicadores (tempo planejado x real, tokens e US$ por tarefa e agente, retrabalho, reprovações, alertas de contexto, handoffs), comparação com sprints anteriores, retrospectiva e pedidos de melhoria do harness via 'hx request'; atualiza o CHANGELOG. Use SEMPRE no fechamento de uma sprint, ou quando Daniel pedir 'relatório da sprint', 'retrospectiva', 'fechar a sprint'."
argument-hint: "<SNN>"
---

# Release Report

Fecha o ciclo: a sprint termina com números e com melhorias para o harness, não só com código entregue.

## Pré-condições

- Todas as tarefas feitas (`hx sprint status SNN`) e o Reviewer aprovou cada uma (`hx review pass <tarefa>`).
- Daniel viu a entrega. Os ajustes que pediu foram feitos; o número vai em `hx sprint feedback <n>` (conta como retrabalho).

## Passos

1. Rode `hx sprint close SNN`. Ele imprime os indicadores e grava `sprint.close` e `sprint.metrics`. Para só rever os números: `hx metrics SNN`.
2. `docs/sprints/SNN-release.md` já existe: o `hx` grava nele a seção `## Execução` (tabela de tarefas, horário de Brasília). Complete-o com as demais seções de `${CLAUDE_PLUGIN_ROOT}/templates/release-report.md`, **sem alterar a tabela de Execução**. Se o arquivo não existir, copie o template. Seções, nesta ordem: Resumo da entrega, Execução, Observações por tarefa, Indicadores, Revisão, Retorno de Daniel, Retrospectiva (com Comparação e Melhorias do harness).
3. **Resumo da entrega:** 3 a 5 linhas para Daniel, sem jargão.
4. **Observações por tarefa:** só o que a tabela não mostra (ex.: reprovada uma vez por falta de teste). Não repita duração, desvio do planejado nem agente: tarefa sem nada além da tabela fica fora da lista. Nenhuma tarefa com observação: escreva "Nada além da tabela."
5. **Indicadores:** cole o bloco do `hx sprint close`. Garanta que apareçam:
   - tempo planejado × real (total e por tarefa);
   - espera por Daniel × trabalho (linha "Espera por Daniel"): na retrospectiva, separe o que foi lentidão do agente do que foi espera;
   - tokens e US$ por tarefa e por agente (valores **estimados**: a assinatura não cobra por token);
   - retrabalho (ajustes de Daniel), reprovações do Reviewer;
   - alertas de contexto (250K) e handoffs.
6. **Revisão:** resultado do Reviewer, cada critério de aceite atendido ou não, e "Lint e tipos: zero erros e zero avisos".
7. **Comparação:** leia os `docs/sprints/*-release.md` anteriores. Diga o que subiu ou desceu (tempo, US$, retrabalho, reprovações) em números lado a lado. Primeira sprint: diga que não há base.
8. **Retrospectiva curta:** o que funcionou, o que não funcionou, 2 ou 3 linhas cada. Sem culpa, com fato.
9. **Melhorias do harness:** para cada oportunidade, rode `hx request --title "..." --need "..." --why "..." --priority alta|media|baixa --example "..."`. O "porquê" cita os **números** que a justificam (ex.: "3 reprovações por falta de teste na S02, 2 na S03"). Coloque o arquivo criado no relatório. Melhoria de **projeto** (não do harness) vai para `docs/backlog.md` do projeto.
10. **CHANGELOG:** se a sprint publica versão do harness, rode `hx release patch|minor|major` (ele atualiza `CHANGELOG.md` e a tag) e confira se as entradas dizem o que mudou para o usuário. Sem versão publicada, não mexa no CHANGELOG.

## Regras

- Números vêm do `hx`, nunca de memória. Sem dado, escreva "sem dado".
- Português do Brasil, frases curtas.
- Não esconda o ruim: reprovação, estouro de tempo e alerta de contexto entram no relatório.
- Nenhum código, prompt ou segredo no relatório (só nomes de arquivo e números).

## Antes de terminar

- [ ] `SNN-release.md` com todas as seções e a tabela de Execução intacta.
- [ ] Tabela de indicadores colada do `hx`.
- [ ] Comparação com a sprint anterior (ou "sem base").
- [ ] Cada melhoria tem um `hx request` e o link.
- [ ] CHANGELOG atualizado se houve release.
