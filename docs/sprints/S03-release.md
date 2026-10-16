# S03 — Release Report: Arrumação antes do Dashboard (v0.4.0)

## Resumo da entrega

- **v0.4.0 publicada** (`hx release minor`): versão estável e plugins dos 2 projetos atualizados.
- O painel do ponytail fica desligado em toda máquina: `hx setup` grava o flag e cria o `HOME` do usuário no Windows quando falta; `hx doctor` avisa. O Task board foi desligado à mão nesta máquina (`pluginConfigs` no `settings.json`).
- `hx sprint close` mostra o tempo corrido das tarefas e, à parte, a espera pelo teste.
- `hx run` com vitest funciona pelo Bash em pasta com espaço.
- A lista nativa de tarefas virou condicional (`sprint-run`, `continue`, `tech-lead`).
- A skill `frontend-design` voltou ao catálogo opcional, com evals passando. O Dashboard já a encontra.
- A auditoria `claude-code-setup` gerou 7 itens no backlog (B023–B029), e entrou o B030 (validar o ciclo de pedidos com o Dashboard).

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | B020: `hx setup` desliga o painel do ponytail (flag + `HOME` no Windows); `hx doctor` avisa | clone A | 15 min | 11:11 | 11:38 | 28 min |
| ✅ | T02 | B021: `sprint close` mostra o corrido das tarefas e a espera à parte | clone B | 10 min | 11:11 | 11:35 | 25 min |
| ✅ | T03 | B019: `hx run` com vitest pelo Bash em pasta com espaço (causa + correção) | clone C | 20 min | 11:11 | 11:35 | 25 min |
| ✅ | T04 | B022: lista nativa de tarefas condicional | clone D | 5 min | 11:11 | 11:35 | 25 min |
| ✅ | T05 | B007: `frontend-design` para `skills/optional/`; corpo exige o plano visual antes do código | clone E | 20 min | 11:11 | 11:37 | 26 min |
| ✅ | T06 | B002: auditoria `claude-code-setup` e itens novos no backlog | tech-lead | 15 min | 11:11 | 11:35 | 25 min |
| ✅ | T07 | Validação real: `hx eval frontend-design` (gatilho e casos); custo no `hx usage` | reviewer | 15 min | 11:15 | 15:26 | 4 h 11 min |
| ✅ | T08 | Revisão final, backlog (B002, B007, B019–B022 → feito (S03)), CHANGELOG e release v0.4.0 (`hx release minor`) | tech-lead + reviewer | 10 min | 15:25 | 15:28 | 3 min |
| ✅ | **Total** | 8 tarefas |  | 45 min | 2026-10-16 11:11 | 2026-10-16 15:28 | 4 h 17 min |

## Observações por tarefa

- **T01:** reprovada 1 vez. Pelo Bash, o `HOME` sempre "existe" (o Git Bash cria a variável), então o setup não percebia a falta. A correção consulta o registro do usuário (`HKCU\Environment`). O `setx` padrão não roda com `HARNESS_NO_PATH`, e com isso os testes de `hx setup` também deixaram de mexer no PATH real.
- **T02:** reaproveita o `wall_min` do `hx metrics`. Teste com espera acima e abaixo de 1 min.
- **T03:** causa confirmada. Pelo Bash, o cwd chega como `c:` minúsculo, e o vitest se carrega duas vezes (`c:` × `C:`). A correção é uma linha no `hx run` (letra do drive em maiúscula). Rodar `npx vitest` direto pelo Bash, sem `hx run`, continua falhando.
- **T04:** também ajustei o `commands/continue.md`, que tinha a mesma instrução.
- **T05:** reprovada 1 vez: um segundo teste do `attach` ainda esperava o catálogo sem a skill.
- **T06:** o plugin foi rodado sem interface (`claude -p`, só leitura). Descartados por falta de evidência no repo: subagente novo (os dois atuais cobrem o uso) e MCP context7 (nenhum problema com documentação desatualizada registrado).
- **T07:** 7 rodadas de eval. O problema estava mais no runner do que na skill:
  1. O juiz só lia a última mensagem, então um plano escrito antes do código nunca chegava até ele. Agora o juiz recebe todo o texto da sessão (`answer`) e o veredito sai da mensagem final (`text`).
  2. Juntar todo o texto também no juiz quebrou o JSON dele numa rodada. Corrigido na mesma tarefa.
  3. O eval passa a registrar quais skills cada caso carregou. Foi assim que apareceu que, no caso 1, a skill nem era acionada.
  4. O caso 2 pedia para mexer "no nosso app" sem app no sandbox. Ganhou fixture (`files/src/Expenses.jsx`).
  - **Decisão de Daniel (opção 1):** o plano visual pode vir antes ou depois do código, desde que a resposta final traga os 5 itens com hex. O Sonnet não escreve texto antes da primeira ferramenta, mesmo com a skill carregada.
  - Saiu do gatilho a consulta de borda "reescreve os textos dos botões… checkout" (16 → 15). Isso enfraquece o teste justamente na parte de textos da interface, que a descrição menciona.
  - **Resultado final:** gatilho 14/15, casos 3/3, sem a skill 1/3.
- **T08:** check completo com zero erros e 286/286 testes; backlog atualizado; release.
- O bundle `cli/dist/hx.js` foi para o commit da T01, e não para o de cada tarefa: T02 e T03 foram commitadas antes, enquanto a T01 ainda estava em correção.

## Indicadores

### Indicadores — S03

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 15 min | 28 min | +13 min | — |
| T02 | 10 min | 25 min | +15 min | — |
| T03 | 20 min | 25 min | +5 min | — |
| T04 | 5 min | 25 min | +20 min | — |
| T05 | 20 min | 26 min | +6 min | — |
| T06 | 15 min | 25 min | +10 min | — |
| T07 | 15 min | 4 h 11 min | +3 h 56 min | — |
| T08 | 10 min | 3 min | −7 min | — |
| **Total** | 1 h 50 min | 6 h 47 min (soma) | | US$ 26.65 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 45 min · 4 h 17 min |
| Soma das tarefas (planejada · real) | 1 h 50 min · 6 h 47 min |
| Tarefas feitas | 8/8 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 332.977 / 685.678 / 3.222.002 / 30.622.670 |
| Custo total | US$ 26.65 |
| Custo por agente | tech-lead US$ 6.22 · main-harness:tech-lead US$ 1.94 · eval US$ 16.83 · claude-code-guide US$ 0.00 · main-harness:reviewer US$ 1.67 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Reprovações do Reviewer | 2 |
| Alertas de contexto | 0 |
| Handoffs | 0 |

## Revisão

- Reviewer único (Opus, por causa da T01), mantido com SendMessage na onda 1 e nas re-revisões de T01, T05 e T07.
- Reprovações: T01 (1) e T05 (1). Nenhuma tarefa chegou ao limite.
- Segurança (T01): nenhum achado. `reg query` e `setx` recebem argumentos fixos, sem shell; a única escrita é `.ponytail-band`.
- Pendências aceitas: o caso 3 da frontend-design não diferencia a skill (o baseline também passa); o caso 2 termina com "Altere o arquivo." (no limite da regra dos evals).

## Retorno de Daniel

- No meio da sprint, pediu para desligar o Task board do ponytail (aviso "could not write the task ledger"). Desliguei no `settings.json`; vale nos chats novos.
- Decidiu a opção 1 da T07 e disse que detalhes técnicos de eval são difíceis de julgar do lado dele. Guardei na memória do projeto: o Tech Lead decide e só reporta.
- Perguntou se o harness está entregando valor ou só engordando. Combinamos congelar o harness e passar ao Dashboard; mudança no harness só por pedido vindo de lá (B030).
- Testou no Dashboard: `hx doctor` limpo na 0.4.0, e a `frontend-design` listada. Nenhum ajuste.

## Retrospectiva

| Indicador | S01 | S02 | S03 |
|---|---|---|---|
| Tempo corrido | 45 min | 30 min | 4 h 17 min (~1 h 15 min sem a pausa de ~3 h) |
| Tempo previsto (relógio) | sem dado | 55 min | 45 min |
| Soma das tarefas (planejada · real) | 4 h · 1 h 58 min | 2 h 20 min · 1 h 14 min | 1 h 50 min · 6 h 47 min (inflada pela pausa e pela fila de revisão) |
| Custo | US$ 16.32 | US$ 11.55 | US$ 26.65 (US$ 16.83 de eval) |
| Retrabalho (ajustes de Daniel) | 1 | 1 | 0 |
| Reprovações do Reviewer | 3 | 1 | 2 |

**O que funcionou**
- Onda 1 com 6 tarefas em paralelo: 5 clones e o Tech Lead, todas prontas em cerca de 25 min.
- Zero ajustes pedidos por Daniel.
- O Reviewer com Opus pegou um problema real na T01: pelo Bash, o setup nunca criaria o `HOME`.
- Registrar as skills carregadas em cada caso de eval achou a causa real da falha da frontend-design (a skill nem era acionada), que vinha desde a S00.

**O que não funcionou**
- Os evals custaram 63% da sprint, em 7 rodadas que refaziam tudo, até o que já passava. Pedido abaixo.
- A pausa de ~3 h entrou no tempo da T07 e no corrido da sprint. Pedido abaixo.
- Cada tarefa da onda só vira "feita" depois da revisão da onda inteira, então a T04 (5 min de trabalho) aparece com 25 min. Pedido abaixo.
- A T07 foi além do escopo planejado: três correções no runner de eval, que não estavam no plano.

## Melhorias do harness (pedidos)

- Média: [hx eval roda só os casos que falharam](../../inbox/2026-10-16-main-harness-hx-eval-roda-so-os-casos-que-falharam.md)
- Média: [tempo corrido desconta pausas longas da sessão](../../inbox/2026-10-16-main-harness-tempo-corrido-desconta-pausas-longas-da-sessao.md)
- Baixa: [duração da tarefa sem a espera pela revisão da onda](../../inbox/2026-10-16-main-harness-duracao-da-tarefa-sem-a-espera-pela-revisao-da-onda.md)

Pelo combinado com Daniel, estes pedidos só entram numa sprint se o uso no Dashboard confirmar a dor.

## CHANGELOG

Seção `[0.4.0]` gerada pelo `hx release` em `CHANGELOG.md`.
