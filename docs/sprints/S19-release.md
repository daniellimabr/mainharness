# S19 — Release Report

> Sprint em andamento. A tabela de execução abaixo é atualizada pelo `hx` a cada tarefa; o Tech Lead completa o restante no fechamento (skill release-report), mantendo esta tabela.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Salvar e enviar o pendente dos 3 projetos, sem segredos; conferir tags e repos privados | tech-lead | 17 min | 16:08 | 16:16 | 8 min |
| ✅ | T02 | Remover dashboard e extensão do código, hooks e testes; rebuild do `hx` | clone (sonnet) | 52 min | 16:11 | 16:42 | 17 min (fila: 1 min, revisão: 13 min) |
| ✅ | T03 | Atualizar documentos da remoção: contratos, ADR 0019, PRD 0001, README, roadmap, B158 cancelado | clone (sonnet) | 26 min | 16:42 | 17:11 | 6 min (fila: 7 min, revisão: 16 min) |
| ✅ | T04 | Harness sem caminhos fixos da máquina (`hx setup` e config) | clone (sonnet) | 26 min | 16:42 | 17:35 | 46 min (fila: 1 min, revisão: 6 min) |
| ✅ | T05 | Guia de instalação no PC pessoal e roteiro de testes no Desktop | tech-lead | 19 min | 17:35 | 18:01 | 22 min (revisão: 3 min) |
| ✅ | T06 | Roteiro de limpeza do notebook corp, com levantamento só de leitura | tech-lead | 17 min | 17:35 | 18:01 | 22 min (revisão: 3 min) |
| ✅ | T07 | Revisão final, CHANGELOG, clone limpo e envio ao GitHub | tech-lead + reviewer | 26 min | 18:01 | 18:35 | 4 min (revisão: 30 min) |
| ✅ | T08 | Pacote de cópia em `C:\migracao-pc`, com lista | tech-lead | 13 min | 18:29 | 18:43 | 8 min (revisão: 6 min) |
| ✅ | **Total** | 8 tarefas |  | 2 h 33 min | 2026-11-26 16:08 | 2026-11-26 18:43 | 2 h 35 min |

## Resumo da entrega

Tudo pronto para a mudança para o PC pessoal: o pendente dos 3 projetos foi para o GitHub, o harness saiu sem dashboard e sem extensão do VS Code e não depende mais das pastas deste notebook. Há um guia de instalação, um roteiro de limpeza e um pacote de cópia em `C:\migracao-pc`. As chaves de acesso não vão no pacote: são copiadas à mão. Nada foi publicado nem apagado do notebook; instalar e testar é a S20.

## Observações por tarefa

- T01: o envio ao GitHub foi feito por Daniel no terminal (o modo auto negou o push do agente).
- T02: um clone decidiu remover também `hx status` e o evento `project.status`.
- T04: reprovada uma vez.
- T05: reprovada duas vezes (limite de reprovações).
- T06: reprovada uma vez.
- T08: o plano não previa que `C:\Financeiro\credentials` guarda uma chave de acesso; ficou fora do pacote.

## Indicadores

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 2 h 33 min · 2 h 35 min |
| Pausas (mais de 30 min sem eventos) | 0 min |
| Espera por Daniel · trabalho | 2 h 4 min · 42 min |
| Soma das tarefas (planejada · real) | 3 h 16 min · 2 h 15 min |
| Tarefas feitas | 8/8 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 474 / 212.289 / 2.200.557 / 17.442.239 |
| Custo total (estimado) | US$ 11,82 |
| Custo por agente | tech-lead US$ 4,18 · clones US$ 3,49 · reviewer US$ 4,15 |
| Custo por executor | Sonnet US$ 11,82 |
| Chamadas por tarefa | sem tarefa 12 · T01 12,5 · T02 46,5 · T03 21 · T04 51 · T05 19 · T06 19 · T07 30,5 · T08 25,5 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0,00 |
| Reprovações do Reviewer | 4 |
| Alertas de contexto · handoffs | 18 · 18 |

| Tarefa | Planejado | Real | Diferença | Custo (US$) |
|---|---|---|---|---|
| T01 | 17 min | 8 min | −9 min | 0,57 |
| T02 | 52 min | 17 min | −35 min | 2,08 |
| T03 | 26 min | 6 min | −20 min | 1,19 |
| T04 | 26 min | 46 min | +20 min | 2,58 |
| T05 | 19 min | 22 min | +3 min | 1,18 |
| T06 | 17 min | 22 min | +5 min | 1,18 |
| T07 | 26 min | 4 min | −22 min | 1,36 |
| T08 | 13 min | 8 min | −5 min | 1,33 |

## Revisão

Reviewer (Sonnet): todas as tarefas aprovadas, 4 reprovações no caminho. T08: nenhum segredo encontrado no pacote (o conteúdo comprimido dos PDFs não foi lido).

| Critério de aceite | Situação |
|---|---|
| 1. Três projetos sem pendência, tags no GitHub | Atendido na T01 e nos envios de Daniel |
| 2. Sem referência a extensão, `state.json` ou `HARNESS_DASHBOARD` | Atendido |
| 3. `hx metrics`, `hx usage` e Release Report funcionando | Atendido |
| 4. `hx setup` grava os caminhos da cópia em outro lugar | Atendido nos testes; não testado em PC novo |
| 5. Clone novo: `npm ci` e `npm run check` | Atendido (605 testes) |
| 6. Guia e roteiro de limpeza revisados por Daniel | Daniel fechou sem pedir ajuste; nada foi testado em PC novo |
| 7. Pacote com lista e sem token nem chave | Atendido |
| 8. Zero erros e zero avisos | Atendido: lint e tipos sem erros nem avisos |

Pontos baixos em aberto: `"stableDir": ""` no `config.json` vira a pasta atual; o `hx doctor` repete o pedido de reabrir o VS Code; o `marketplace.json` cita `C:\harness-stable`; 9 avisos moderados do `npm audit`. O Dashboard IA deixa de receber eventos de contexto, atenção e erro.

## Retorno de Daniel

Nenhum ajuste (0 rodadas). Durante a sprint decidiu manter o repo `main-harness` público. Depois da entrega perguntou duas vezes qual era o próximo passo.

## Retrospectiva

**Funcionou:** remoção grande (T02, T03) bem abaixo do planejado com clones; o corrido ficou no previsto (2 h 35 min contra 2 h 33 min); o clone limpo e a revisão do pacote confirmaram a entrega por um segundo caminho.

**Não funcionou:** T04 levou 20 min a mais; T05 chegou ao limite de reprovações; o `hx sprint open` da versão instalada falhou com `;` e crase nos títulos (usado o build do repo); a entrega não deixou claro o que Daniel devia fazer.

### Comparação

| | S17 | S18 | S19 |
|---|---|---|---|
| Tempo corrido | 1 h 15 min | 1 h 35 min | 2 h 35 min |
| Custo (US$) | 27,72 | 8,10 | 11,82 |
| Reprovações | 0 | 2 | 4 |
| Retrabalho | 0 | 0 | 0 |
| Alertas de contexto · handoffs | sem dado | 3 · 3 | 18 · 18 |

Espera por Daniel: 2 h 4 min dos 2 h 35 min (S18: 1 h 2 min). O Reviewer foi 35% do custo (S18: 16%).

### Melhorias do harness

- `inbox/2026-11-26-main-harness-entrega-da-sprint-com-proximos-passos-numerados.md`
- `inbox/2026-11-26-main-harness-investigar-alertas-de-contexto-da-s19.md`
- `inbox/2026-11-26-main-harness-suite-de-testes-lenta-5-min-atrasa-a-sprint.md` (já registrado na sprint)
