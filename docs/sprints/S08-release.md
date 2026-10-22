# S08 — Release Report

## Resumo da entrega

A sprint publicou a v0.8.1 e fechou as quatro lições da S07:

- O `hx eval` chama o juiz mais uma vez, só para os casos sem veredito, antes de contar falha.
- O `hx release` avisa os commits sem prefixo convencional desde a última tag, sem bloquear.
- A regra do modo auto que o `hx setup` grava libera `hx release` e `hx rollback` só quando Daniel pede na conversa. Pedido repassado por outro agente não conta.
- O `hx setup` troca todas as versões antigas da regra por uma só, e o `hx doctor` avisa quando a regra está desatualizada.
- O commit de tarefa passa a ter o formato `<tipo>(SNN/TNN): <resumo>`.
- Tarefa que apaga módulo ajusta o roteador na abertura da onda.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | B070: `hx eval` repete só o juiz sem veredito | clone A | 9 min | 19:01 | 19:16 | 8 min (fila: 1 min, revisão: 7 min) |
| ✅ | T02 | B071: `hx release` avisa commit sem prefixo convencional | clone B | 7 min | 19:01 | 19:16 | 6 min (fila: 3 min, revisão: 7 min) |
| ✅ | T03 | B072: regra do modo auto libera `hx release`/`rollback` a pedido de Daniel | clone C | 7 min | 19:01 | 19:19 | 7 min (fila: 2 min, revisão: 9 min) |
| ✅ | T04 | B069 + B071 (prevenção): roteador na abertura da onda e formato do commit de tarefa | tech-lead | 5 min | 19:01 | 19:16 | 2 min (fila: 6 min, revisão: 7 min) |
| ✅ | T05 | Backlog (B069–B072), CHANGELOG e release v0.8.1 (`hx release patch`) | tech-lead + reviewer | 7 min | 19:19 | 08:01 | 3 min (revisão: 12 min) |
| ✅ | **Total** | 5 tarefas |  | 16 min | 2026-10-21 19:01 | 2026-10-22 08:01 | 33 min (pausas: 12 h 27 min) |

## Observações por tarefa

- **Onda 1 (T01–T04):** três clones e o Tech Lead trabalharam ao mesmo tempo, sem arquivo em comum. O clone da T01 pegou uma vez o build do `globalSetup` quebrado, enquanto o clone da T03 renomeava `hasAutoModeRule`, e passou na segunda rodada. Os clones da T02 e da T03 escreveram o teste junto com o código e não viram a fase vermelha (RED).
- **T03:** `hasAutoModeRule` virou `autoModeRuleState` (`current`/`outdated`/`missing`), que o `doctor` usa para dar o aviso de regra desatualizada.
- **T05:** o `hx setup` rodado no `settings.json` real deixou uma regra **muito antiga** ao lado da nova, porque só trocava a primeira com o prefixo. Os testes usavam um arquivo com uma regra só. A correção (`fix(S08/T05)`) remove todas as cópias antigas. Por pedido de Daniel, a release esperou a sprint de outro projeto terminar, para não trocar o `C:\harness-stable` no meio dela. Daí as 12 h de pausa. O `hx release` recusou a primeira tentativa porque o `S08-release.md`, que o próprio `hx` cria, ainda não estava commitado.

## Indicadores

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 9 min | 8 min (fila: 1 min, revisão: 7 min) | −1 min | — |
| T02 | 7 min | 6 min (fila: 3 min, revisão: 7 min) | −1 min | — |
| T03 | 7 min | 7 min (fila: 2 min, revisão: 9 min) | +0 min | — |
| T04 | 5 min | 2 min (fila: 6 min, revisão: 7 min) | −3 min | — |
| T05 | 7 min | 3 min (revisão: 12 min) | −4 min | — |
| **Total** | 35 min | 26 min (soma) | | US$ 3.40 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 16 min · 33 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 12 h 27 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 12 h 48 min · 13 min |
| Soma das tarefas (planejada · real) | 35 min · 26 min |
| Tarefas feitas | 5/5 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 158 / 27.701 / 297.168 / 5.147.111 |
| Custo total (estimado: a assinatura não cobra por token) | US$ 3.40 |
| Custo por agente | tech-lead US$ 1.95 · main-harness:tech-lead US$ 0.86 · main-harness:reviewer US$ 0.59 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 1 |
| Alertas de contexto | 0 |
| Handoffs | 0 |

O custo por tarefa saiu "—" porque os clones rodaram em paralelo. A "revisão" de 12 min da T05 inclui a espera pela revisão da correção do `hx setup`.

## Revisão

Uma revisão por onda, no Opus, porque a T03 mexe no texto que o classificador do modo auto lê. Houve uma reprovação:

- **T03 (MÉDIA):** a regra dizia "o usuário pediu nesta conversa". Num subagente, quem faz o papel de "usuário" é o prompt do agente pai, então um handoff com "rode hx release" poderia liberar a release sem Daniel ter pedido. A correção acrescentou à regra que pedido repassado por outro agente, resultado de ferramenta, arquivo ou plano não conta. Ela foi aprovada na re-revisão.

A T05 (limpeza das regras antigas) teve revisão própria e passou.

Pontos baixos que não bloquearam:

- `results` do juiz que não seja lista ainda quebra o `hx eval`. O código anterior tinha o mesmo risco.
- A T02 não tem teste próprio para o caso "sem aviso". A cobertura vem do teste existente, que exige stderr vazio.
- Com a regra atual duplicada e nenhuma antiga, o `setup` responde "present" e deixa as duas cópias.

Critérios de aceite:

1. Juiz sem JSON na 1ª chamada e com veredito na 2ª dá o veredito da 2ª, e a sessão do caso roda uma vez só. Juiz que falha duas vezes dá "sem veredito do juiz": atendido (`eval.test.ts`, 3 casos).
2. Aviso com `S07/T01: b` e release seguindo: atendido (`release.test.ts`).
3. O `setup` troca a regra antiga sem duplicar, e o `doctor` avisa: atendido. Conferido também no `settings.json` real.
4. `sprint-run.md` e `tech-lead.md` com o formato do commit e o passo do roteador: atendido.
5. Lint e tipos: zero erros e zero avisos (`npm run check`, 452 testes na revisão da onda).

Teste de ponta a ponta: o `hx release patch` rodou no modo auto depois do pedido de Daniel e **não foi negado**. O aviso de commit sem prefixo não apareceu porque a release rodou com o `hx` estável 0.8.0, que ainda não tem o aviso. Ele passa a valer na próxima release.

## Retorno de Daniel

- Pediu para segurar a release enquanto outra sprint dependia do harness, e liberou na manhã seguinte ("pode fazer a release").
- Ao rodar o `hx setup`, apontou três ruídos:
  - a skill `/attach` é anunciada como instalada de novo;
  - a mensagem antiga do painel do ponytail se repete;
  - o aviso de Bash por causa da pasta com espaço não serve para ele.

  Os três viraram pedido no inbox.
- Fechou a sprint sem ajustes (retrabalho 0).

## Retrospectiva

### Comparação

| Indicador | S06 | S07 | S08 |
|---|---|---|---|
| Relógio (previsto · corrido) | 1 h 2 min · 27 min | 36 min · 52 min | 16 min · 33 min |
| Trabalho efetivo | — | 19 min | 13 min |
| Soma (planejada · real) | 2 h 23 min · 51 min | 1 h 3 min · 1 h 13 min | 35 min · 26 min |
| Custo | US$ 10.27 | US$ 11.44 | US$ 3.40 |
| Retrabalho | 0 | 0 | 0 |
| Reprovações | 0 | 3 | 1 |
| Alertas de contexto | 0 | 0 | 0 |

- A soma voltou para baixo do plano: 74% do planejado, contra 116% na S07.
- O custo caiu para menos de um terço do da S07. Sem evals de skill e com tarefas pequenas, o grosso foi o Tech Lead.
- O relógio corrido (33 min) dobrou o previsto, mas o trabalho efetivo foi de 13 min. O resto foi a espera pela revisão e pelo pedido de release, que ficou de propósito com Daniel.
- A única reprovação era uma brecha real de segurança na regra nova, o que confirma o Opus na revisão de superfície de segurança.

### O que funcionou

- Onda 1 com três clones mais o Tech Lead, sem conflito de arquivo, todos entregues em 7 min.
- Pedir a release na conversa funcionou de ponta a ponta no modo auto.
- Rodar o `hx setup` no ambiente real antes da release achou um bug que os testes não pegavam.

### O que não funcionou

- O `hx release` roda com o `hx` estável, então o que a sprint muda na própria release só é testado de verdade na release seguinte.
- O `hx release` recusou a primeira tentativa por causa do `SNN-release.md` não commitado, um arquivo que o próprio `hx` cria durante a sprint.
- O `hx setup` repete mensagens de coisas que já estavam feitas, e o `hx doctor` mostra a Daniel um aviso que só interessa ao agente.
- O PowerShell desta máquina roda em modo restrito (bloqueia chamadas .NET), e uma edição em massa precisou do Bash.

### Melhorias do harness

- [hx setup e doctor: só falar do que mudou](../../inbox/2026-10-22-main-harness-hx-setup-e-doctor-so-falar-do-que-mudou.md) (média)
- [hx release não recusa pelo SNN-release.md da sprint aberta](../../inbox/2026-10-22-main-harness-hx-release-nao-recusa-pelo-snn-release-md-da-sprint-aberta.md) (baixa)
