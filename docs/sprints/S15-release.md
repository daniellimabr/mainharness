# S15 — Release Report

Versão **v0.13.0** · 2026-10-30 · sprint fechada sem ajustes pedidos por Daniel.

## Entrega

- `hx worker check` com sonda pequena e de ~100 KB: separa cota, tamanho, chave e provedor fora (B134).
- Custo do clone e do Reviewer atribuído pela tarefa do `agent_id`, sem rateio igual (B135).
- Evento `handoff` sem duplicata na compactação (B132).
- DeepSeek V4 Pro testado direto no provedor (`api.deepseek.com/anthropic`), em teste cego: nota **66**, contra 67 (Sonnet) e 68 (Opus). 3 a 5 vezes mais lento (~420 s contra ~114 s do Sonnet) e cerca de US$ 0,15 por tarefa. ADR 0016, aceito por Daniel como **opção pontual**; o padrão segue sendo Sonnet (B133).
- Argon ficou fora: API paga e sem formato Anthropic.
- Regra "worker (deepseek)" em `agents/tech-lead.md`; backlog, roadmap e `docs/experiments/S15-resultado.md` atualizados.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | `hx worker check` com sonda pequena e grande, erro por causa (B134) | clone (sonnet) | 38 min | 14:40 | 14:51 | 5 min (fila: 5 min, revisão: 1 min) |
| ✅ | T02 | Custo do clone e do Reviewer pela tarefa do `agent_id` (B135) | clone (sonnet) | 29 min | 14:40 | 14:51 | 1 min (fila: 9 min, revisão: 1 min) |
| ✅ | T03 | `handoff` sem duplicata na compactação (B132) | clone (sonnet) | 24 min | 14:40 | 14:51 | 7 min (fila: 3 min, revisão: 1 min) |
| ✅ | T04 | Contas e apelidos diretos: Daniel cria as chaves, Tech Lead configura e roda o `check` novo (B133) | tech-lead (sonnet) + Daniel | 43 min | 14:56 | 14:56 | 0 min |
| ✅ | T05 | Teste cego: protocolo, corridas dos apelidos que passaram, nota do juiz | tech-lead (sonnet) + trabalhadores + reviewer (sonnet) | 1 h 26 min | 14:57 | 15:23 | 26 min |
| ✅ | T06 | Resultado, ADR 0016 e decisão de Daniel | tech-lead (sonnet) | 24 min | 15:23 | 16:11 | 11 min |
| ✅ | T07 | Revisão final, regra do Agente (se aceitar), backlog, CHANGELOG, roadmap e release v0.13.0 | tech-lead (sonnet) + reviewer (sonnet) | 19 min | 16:11 | 16:25 | 12 min (revisão: 2 min) |
| ✅ | **Total** | 7 tarefas |  | 3 h 30 min | 2026-10-30 14:40 | 2026-10-30 16:25 | 1 h 8 min (pausas: 37 min) |

## Indicadores

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 3 h 30 min · 1 h 8 min |
| Pausas (mais de 30 min sem eventos) | 37 min |
| Espera por Daniel · trabalho | 1 h 16 min · 31 min |
| Soma das tarefas (planejada · real) | 4 h 23 min · 1 h 2 min |
| Tarefas feitas | 7/7 |
| Custo total | US$ 4,15 (tudo Sonnet) |
| Custo por agente | tech-lead US$ 2,39 · executor US$ 1,02 · reviewer US$ 0,74 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 286 / 64.271 / 530.307 / 9.503.490 |
| Retrabalho (ajustes de Daniel) | 0 |
| Reprovações do Reviewer | 0 |
| Alertas de contexto · handoffs | 2 · 2 |

Custo por tarefa: T01–T03 US$ 0,47 cada (rateado entre os 3 clones em paralelo), T05 US$ 0,79, T06 US$ 0,43, T07 US$ 1,26. Os US$ 0,45 do DeepSeek no painel do provedor não entram nesse total.

## Revisão

O Reviewer (Sonnet) fez uma revisão por onda e aprovou todas as tarefas, sem reprovação. Na T07, uma observação baixa: o B130 pedia validação em código contra `gemini`, que não existe; o texto do B130 foi ajustado (a regra vive em `agents/tech-lead.md`).

## Retorno de Daniel

Nenhum ajuste. Aceitou o ADR 0016 como opção pontual (foco segue no Sonnet) e pediu pente fino em comandos mal construídos, que gastam franquia. Aprovou também o aviso no `pre-bash` (B136) e a sprint "Harness leve" (B137).

## Retrospectiva

- **Prazo:** 1 h 2 min reais contra 4 h 23 min planejadas; as estimativas de clone seguem muito folgadas (a T02 levou 1 min para 29 planejados).
- **Custo:** US$ 4,15 numa sprint de 7 tarefas, sem Opus. A parte do tech-lead (US$ 2,39) domina; a T07 foi a mais cara (US$ 1,26), por causa da suíte de testes e das releituras.
- **Franquia perdida com comando errado:** vários comandos mal construídos (BOM com `Set-Content`, métodos .NET no PowerShell restrito, `--help` que não existe, pipe com `Select-Object`). Virou lista de armadilhas na memória e o B136.
- **Suíte de testes instável no Windows:** `worker.test.ts` caiu duas vezes (exit 3221226505) na suíte inteira; passa isolado e com `--maxWorkers=3` (516/516). Vale fixar o limite.
- **Release bloqueado:** o classificador automático negou `hx release minor` duas vezes (rótulo "Production Deploy"); só rodou depois que Daniel digitou o comando no chat.
- **Externos:** DeepSeek empata com o Sonnet em qualidade e perde em tempo; só vale pontualmente, para poupar limite. Falta reproduzir o aceite 0/N nos desafios 1 e 2.

## Melhorias no harness (viraram pedido)

1. `vitest` com `--maxWorkers=3` no `npm test` (2 quedas na suíte inteira).
2. `hx release` documentado e liberado para o classificador (2 bloqueios).
