# S10 — Release Report

## Resumo da entrega

- Versão **v0.9.0** publicada.
- O harness agora passa tarefas a um **trabalhador no Gemini**, com `hx worker run TNN <handoff>`. O trabalhador roda em segundo plano pelo OmniRoute, e o chat nunca muda de modelo.
- `hx worker status` diz se o trabalhador está pronto. `hx usage` mostra o Gemini numa linha à parte.
- Quando o uso do Claude passa de 90%, o harness avisa uma vez por sessão e indica a skill nova `worker`.
- A retomada agendada saiu. A primeira entrega real ao Gemini (o backlog da T09) funcionou.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Spike: chat e `claude -p` → OmniRoute → Gemini CLI (conta dedicada) | tech-lead + Daniel | 29 min | 10:53 | 11:32 | 39 min |
| ✅ | T02 | Clones em Sonnet por padrão; Opus em tarefa complexa | tech-lead | 4 min | 10:15 | 10:16 | 1 min |
| ✅ | T03 | Remover a retomada agendada + migração que limpa as tarefas | clone A (opus) | 18 min | 10:15 | 10:30 | 9 min (fila: 4 min, revisão: 2 min) |
| ✅ | T04 | `hx worker status`, sem `on/off` e sem mexer no `settings.json` | clone B (opus) | 11 min | 12:02 | 15:19 | 4 min (fila: 2 min, revisão: 6 min) |
| ✅ | T05 | `hx usage`: linha "fora do Claude" para modelo fora da tabela | clone C | 11 min | 11:32 | 15:19 | 1 min (fila: 34 min, revisão: 6 min) |
| ✅ | T06 | Trabalhador `hx worker run TNN <handoff>` | clone B (opus) | 22 min | 15:19 | 18:45 | 8 min (fila: 8 min, revisão: 5 min) |
| ✅ | T07 | Regra de delegação, gatilho no limiar (`Stop` + `hx task`) e skill `worker` com evals | tech-lead (regra + skill) + clone A (código) | 29 min | 15:29 | 18:58 | 11 min (fila: 4 min, revisão: 9 min) |
| ✅ | T08 | ADR 0012 final, roadmap e guia `docs/omniroute.md` | tech-lead | 14 min | 11:32 | 15:19 | 41 min |
| ✅ | T09 | Backlog, CHANGELOG e release v0.9.0 (`hx release minor`), com parte delegada ao trabalhador (E2E) | tech-lead + gemini + reviewer | 14 min | 18:52 | 19:09 | 13 min (fila: 3 min) |
| ✅ | **Total** | 9 tarefas |  | 1 h 45 min | 2026-10-23 10:15 | 2026-10-27 19:09 | 2 h 44 min (pausas: 102 h 10 min) |

## Observações por tarefa

- **Plano:** revisado e reaprovado no meio da sprint, em 23/10. O "modo reserva", que trocava o modelo pelo `settings.json`, travou o chat porque o Claude Code aplica esse arquivo na hora em todos os chats. No lugar dele entrou o trabalhador (ADR 0012).
- **T06:** o Reviewer aprovou, com 3 achados. Dois foram corrigidos antes do commit: o limite de 60 min do trabalhador e a proteção da entrada do processo. O terceiro, a ordem do lock, foi para o B099. Depois, a primeira entrega real mostrou outro erro: o agente Tech Lead fixa `claude-opus-5-5`, e esse nome chegava ao OmniRoute. A correção foi passar `--model` (`fix(S10/T06)`).
- **T07:** os evals da skill `worker` precisaram de 4 rodadas. Na 1ª, a pasta do handoff ficava em `.claude/`, que o Claude Code protege, e passou para `.worker/`. Na 2ª e na 3ª, o `hx` estável (0.8.2) da sandbox ainda não tinha o comando `worker`. A 4ª passou.
- **T09:** a parte do backlog (B095 a B099) foi feita pelo Gemini (`gemini-3.5-flash-lite`), no formato certo e só nos arquivos permitidos. Antes, houve uma tentativa que falhou porque o login do Gemini no OmniRoute tinha expirado. Durante a entrega apareceu um 429 (limite por minuto do plano grátis), e o Claude Code repetiu a chamada sozinho.

## Indicadores

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 29 min | 39 min | +10 min | — |
| T02 | 4 min | 1 min | −3 min | — |
| T03 | 18 min | 9 min (fila: 4 min, revisão: 2 min) | −10 min | — |
| T04 | 11 min | 4 min (fila: 2 min, revisão: 6 min) | −7 min | — |
| T05 | 11 min | 2 min (fila: 34 min, revisão: 6 min) | −10 min | — |
| T06 | 22 min | 8 min (fila: 8 min, revisão: 5 min) | −14 min | — |
| T07 | 29 min | 11 min (fila: 4 min, revisão: 9 min) | −18 min | — |
| T08 | 14 min | 41 min | +27 min | — |
| T09 | 14 min | 13 min (fila: 3 min) | −1 min | — |
| **Total** | 2 h 32 min | 2 h 7 min (soma) | | US$ 26.99 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 1 h 45 min · 2 h 44 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 102 h 10 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 1 h 27 min · 1 h 17 min |
| Soma das tarefas (planejada · real) | 2 h 32 min · 2 h 7 min |
| Tarefas feitas | 9/9 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 460.906 / 401.695 / 3.070.283 / 44.135.983 |
| Custo total (estimado: a assinatura não cobra por token) | US$ 26.99 |
| Custo por agente | tech-lead US$ 11.27 · main-harness:tech-lead US$ 4.36 · main-harness:reviewer US$ 2.22 · eval US$ 9.14 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 0 |
| Alertas de contexto | 0 |
| Handoffs | 1 |

O custo do trabalhador Gemini não entra na conta: ele roda na cota grátis do Google.

## Revisão

- **Reviewer:** aprovou T03, T04, T05, T06 e T07, sem nenhuma reprovação. Usou Opus nas tarefas com superfície de segurança: hooks, processo filho com token e o `settings.json`.
- **Critérios de aceite:** todos atendidos.
  - O chat nunca muda de modelo. O teste confere que o `settings.json` fica intacto e que as variáveis do OmniRoute ficam só no processo filho.
  - Há um trabalhador por vez, com relatório e eventos `worker.start`/`worker.end` para o dashboard.
  - O aviso vem uma vez por sessão: 91% avisa e 89% não.
  - A skill `worker` tem evals passando: acionamento 8/8 e casos 3/3.
  - A entrega real ao Gemini, na T09, funcionou.
- **Lint e tipos:** zero erros e zero avisos. Testes: 457/457.

## Retorno de Daniel

- Ajudou a configurar o OmniRoute: ligou o serviço e trocou a chave do Google AI Studio, que tinha expirado.
- Apontou o gasto alto: só a retomada da sprint consumiu cerca de 18% da janela de 5 h.
- Nenhum ajuste foi pedido na entrega.

## Retrospectiva

### Comparação

| | S08 | S09 | S10 |
|---|---|---|---|
| Custo (US$, estimado) | 3.40 | 15.42 | 26.99 |
| Relógio (previsto · corrido) | 16 min · 33 min | 14 min · 59 min | 1 h 45 min · 2 h 44 min |
| Retrabalho | 0 | 1 | 0 |
| Reprovações | 1 | 0 | 0 |

A S10 foi bem maior que as duas anteriores: 9 tarefas, com spike, plano refeito e integração externa. O custo subiu junto. Os evals foram 34% do custo (US$ 9.14), e cerca de dois terços disso vieram de rodadas repetidas.

### O que funcionou

- O trabalho em paralelo (clones e Reviewer), com zero reprovações e zero retrabalho.
- A primeira delegação ao Gemini entregou certo, sem gastar Claude na parte delegada.
- Do tempo corrido, 1 h 27 min foi espera por Daniel (login e configuração do OmniRoute, aprovação do plano revisado), não lentidão dos agentes.

### O que não funcionou

- O "modo reserva" quebrou o chat, e o plano teve de ser refeito.
- Os evals de comando novo rodam com o `hx` antigo da sandbox, o que gerou 3 rodadas perdidas.
- O handoff ficou desatualizado (era das 12:05, e o trabalho seguiu até 15:29). Por isso a retomada teve de reler os diffs, e Daniel estimou cerca de 18% da janela de 5 h gasta só para recomeçar.
- O `hx worker status` disse "pronto" com o login do Gemini expirado (B100).

### Melhorias do harness

- [hx eval usa o hx do repo, não o estável](../../inbox/2026-10-27-main-harness-hx-eval-usa-o-hx-do-repo-nao-o-estavel.md) (alta)
- [Handoff atualizado a cada tarefa](../../inbox/2026-10-27-main-harness-handoff-atualizado-a-cada-tarefa.md) (média)
- Já estão no backlog: B097 a B100 (aviso de limite, lock do trabalhador, `worker status` conferir o login).
