# S16 — Release Report

> Sprint fechada. Release v0.14.0: Daniel roda `hx release minor`.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | `maxWorkers=3` no `npm test` (B138) | clone (sonnet) | 11 min | 16:48 | 10:54 | 11 min (revisão: 5 min) |
| ✅ | T02 | `hx release` negado no modo auto: regra e passo "Daniel roda" nos textos (B104) | clone (haiku) | 8 min | 16:48 | 10:54 | 1 min (fila: 10 min, revisão: 5 min) |
| ✅ | T03 | Marcas `[planejado]`/`[concluído]` no backlog e roadmap atualizado no fechamento, com evals (B084, B085, B089) | clone (sonnet) | 45 min | 16:59 | 11:05 | 4 min (fila: 12 min) |
| ✅ | T04 | Tarefa reaberta aceita `phase`/`review`; `approve` troca a Aprovação; mensagem do barrado (B083, B082, B095, B128) | clone (sonnet) | 38 min | 16:48 | 10:54 | 6 min (fila: 6 min, revisão: 5 min) |
| ✅ | T05 | `pre-bash` avisa as armadilhas de comando (B136) | clone (sonnet) | 19 min | 16:48 | 10:54 | 7 min (fila: 5 min, revisão: 5 min) |
| ✅ | T06 | `HARNESS_DASHBOARD=off` (emit e hooks de observação) | clone (sonnet) | 26 min | 16:48 | 10:54 | 5 min (fila: 6 min, revisão: 5 min) |
| ✅ | T07 | `scripts/overhead.mjs`: ms por hook, chamadas e tokens injetados por sprint | clone (sonnet) | 30 min | 16:59 | 11:05 | 8 min (fila: 8 min) |
| ✅ | T08 | Protocolo do experimento e definição do perfil leve | tech-lead (sonnet) | 23 min | 16:48 | 10:54 | 11 min (revisão: 5 min) |
| ✅ | T09 | `bench.mjs --perfil atual/leve/sem-dashboard` e os arquivos do perfil leve | clone (sonnet) | 34 min | 16:59 | 11:05 | 8 min (fila: 8 min) |
| ✅ | T10 | Rodar overhead e as 9 corridas, medir abertura, nota do juiz cego | tech-lead (sonnet) + reviewer (sonnet) | 1 h 30 min | 11:05 | 11:37 | 32 min |
| ✅ | T11 | Resultado, ADR 0017 e decisão de Daniel | tech-lead (sonnet) | 26 min | 11:37 | 11:38 | 0 min |
| ✅ | T12 | Revisão final, backlog, CHANGELOG, roadmap e release v0.14.0 (Daniel roda o `hx release`) | tech-lead (sonnet) + reviewer (sonnet) | 19 min | 11:38 | 11:42 | 3 min (revisão: 2 min) |
| ✅ | Ajuste 1 | 1 ajuste(s) |  |  | 11:58 | 13:54 | 59 min |
| ✅ | **Total** | 12 tarefas |  | 3 h 15 min | 2026-10-30 16:48 | 2026-11-04 11:42 | 1 h 4 min (pausas: 113 h 50 min) |

## Entrega

- Harness: ; ;  com perfis  e ;  avisa armadilhas de comando; tarefa reaberta aceita /;  troca a Aprovação; marcas / no backlog; ; regra do  (Daniel roda).
- Experimento: Dashboard custa muito menos de 2% da sprint (fica ligado). Repetição de 27 corridas com juiz cego: atual 22,2, leve 22,8, leve com plugins 23,3; economia de tokens 28% (leve) e 14% (com plugins).
- Decisão de Daniel: manter o padrão, sem opção leve (ADR 0017 aceito). Detalhes em .

## Indicadores

12/12 tarefas; soma planejada 6 h 9 min contra 1 h 37 min real; custo US$ 10,47 (S15: 4,15; S14: 9,88), dos quais US$ 1,81 no ajuste e US$ 2,49 nos evals/bench; 0 reprovações do Reviewer; 1 ajuste de Daniel; 3 alertas de contexto e 3 handoffs. Tabela completa em .

## Revisão

Reviewer Sonnet por onda, 0 reprovações nas 12 tarefas. O ajuste (repetição do teste) foi conferido por lint, tipos e 551 testes, sem Reviewer.

## Retorno de Daniel

Pediu repetir o teste: o resultado não provava que o leve mantém a qualidade e o leve tirou plugins valiosos. A repetição achou falha no meu teste (plugins não carregavam na 1ª versão do leve-plugins), corrigida e refeita. Daniel decidiu manter o padrão atual, sem opção leve.

## Retrospectiva

- **Foi bem:** execução 4x mais rápida que o plano; o retorno de Daniel melhorou a conclusão (uma corrida por caso não bastava).
- **Custo:** a S16 ficou 2,5x mais cara que a S15, quase tudo em corridas de benchmark (evals US$ 2,49) e no ajuste; o resultado final (não mudar nada) fez a sprint valer como medição, não como ganho.
- **Aprendizado:** variante de experimento nova precisa de uma conferência de que ela realmente muda o que diz mudar (plugins carregados) antes de gastar as corridas.
- **Atrito:** os horários Início/Fim da tabela aparecem sem data e cruzam dias (16:48 → 10:54); o ajuste não é uma tarefa, então seu custo e commits (T13) ficam fora das tarefas.

## Melhorias no harness (viraram pedido)

1. Tabela de execução mostrar a data quando a tarefa cruza o dia.
2.  abrir uma tarefa de ajuste (TNN) para o custo, o tempo e os commits do ajuste ficarem ligados a ela.
