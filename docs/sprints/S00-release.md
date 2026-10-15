# S00 — Release Report: Criação do Main Harness (v0.1.0)

- **Projeto:** main-harness
- **Versão do harness:** 0.1.3 (a sprint entregou a v0.1.0; as correções do retrabalho geraram v0.1.1 a v0.1.3)
- **Período (UTC):** 2026-10-15 05:00 → 2026-10-15 17:53 (02:00 → 14:53 em Brasília)
- **Plano:** `docs/sprints/S00-plan.md`

## Resumo da entrega

O Main Harness existe: plugin do Claude Code com o CLI `hx`, hooks, agentes, skills e o processo de sprint, instalado a partir de `C:\harness-stable`. As 16 tarefas foram feitas e revisadas.

Daniel testou no Dashboard IA e achou falhas de instalação (`hx` fora do PATH, pasta sem git). Elas foram corrigidas nas versões 0.1.1 a 0.1.3. Hoje o `hx doctor` dá 15/15 no Dashboard IA.

O ponto fraco foi o consumo: cerca de US$ 42 medidos e o limite de uso da conta estourou 3 vezes. Resumo para Daniel: https://claude.ai/artifact/E1y2vVhf1Bt26xHctHRApu

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | Base do repo: package, tsconfig, eslint, prettier, vitest, build esbuild, manifests, CLAUDE.md, index.md, .gitignore | tech-lead | 20 min | 02:00 | 02:02 | 2 min |
| ✅ | T02 | Núcleo do hx: caminhos, config, projetos, eventos (ULID, esquema, gravação), log de erros, roteador de comandos | tech-lead | 30 min | 02:02 | 02:05 | 3 min |
| ✅ | T03 | Consumo: adaptador de transcripts, preços, contexto, `hx usage` | clone A | 30 min | 02:08 | 02:16 | 9 min |
| ✅ | T04 | Hooks: session-start, post-edit (lint + index.md), pre-bash, stop/subagent-stop (consumo, 250K), pre-compact, session-end | clone B | 45 min | 02:08 | 02:23 | 15 min |
| ✅ | T05 | Comandos de sprint: task, sprint (open/close/approve), handoff, run, request, metrics | clone C | 45 min | 02:08 | 02:19 | 11 min |
| ✅ | T06 | attach, migrate, skills on/off, doctor + templates | clone D | 45 min | 02:08 | 02:19 | 11 min |
| ✅ | T07 | release e rollback | tech-lead | 30 min | 02:17 | 02:19 | 2 min |
| ✅ | T08 | Agentes, comandos, hooks.json, bin/ | tech-lead | 25 min | 02:14 | 02:17 | 3 min |
| ✅ | T09 | Skills próprias + evals | writer | 40 min | 02:11 | 02:19 | 8 min |
| ✅ | T10 | Skills de terceiros: cópia, adaptação do tdd-workflow, SOURCE.md, skill-creator | tech-lead | 30 min | 02:09 | 02:14 | 5 min |
| ✅ | T11 | Documentação: contrato de eventos, roadmap, backlog | writer | 20 min | 02:11 | 02:19 | 8 min |
| ✅ | T12 | Teste E2E com caminhos com espaço | tech-lead | 25 min | 02:20 | 02:23 | 3 min |
| ✅ | T13 | Revisão: lint e tipos zerados, testes, security-review, revisão Ponytail, critérios de aceite | reviewer | 30 min | 02:24 | 08:51 | 6 h 27 min |
| ✅ | T14 | Instalação: `C:\harness-stable`, marketplace, plugin ativo no Main Harness, validação prática num chat novo | tech-lead | 20 min | 02:24 | 02:28 | 4 min |
| ✅ | T15 | Testes das skills com skill-creator (acionamento + casos) | reviewer | 40 min | 02:21 | 14:03 | 11 h 43 min |
| ✅ | T16 | Release v0.1.0, rollback testado, Release Report | tech-lead + writer | 20 min | 14:03 | 14:53 | 50 min |

## Observações por tarefa

- T04: o plano dizia `cli/src/index/`; o código ficou em `cli/src/repomap/`. Divergência de caminho no plano, sem efeito na entrega.
- T13 (6 h 27 min) e T15 (11 h 43 min): durações infladas por duas pausas no limite de uso da conta. Não é tempo de trabalho.
- T15: o `run_eval.py` do skill-creator não roda no Windows. Os evals foram feitos com scripts próprios. Skills com evals carimbados: adr, prd, sprint-plan, release-report, handoff, security-review, tdd-workflow, archify e optional/webapp-testing.
- T15: `frontend-design` saiu do catálogo (foi para `skills-pending/`). O caso 1 dos evals falhou 3 vezes. Ver B007.
- T16: o rollback real não pôde ser testado, porque só existia uma versão. Ele está coberto por `cli/test/release.test.ts`. Hoje existem v0.1.0 a v0.1.3.
- T13: a revisão de segurança reprovou 3 vezes. O `pre-bash` virou um classificador allow/ask/deny e passou a tratar variáveis de shell, `cmd /c`, `bash -lc`, PowerShell, `xargs`, `find -delete` e a pasta temporária do Claude (liberada).
- Retomada automática após o limite de uso: estacionada (B005). O classificador de segurança do Claude Code bloqueia.
- Acentos trocados na saída do PowerShell 5.1: é só exibição. Vai para o backlog.

## Indicadores

Gerado por `hx sprint close S00`. Estimativa de custo: a assinatura não cobra por token. Pequenas diferenças de minutos entre esta tabela e a de Execução vêm de arredondamento.

### Indicadores — S00

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 20 min | 2 min | −18 min | — |
| T02 | 30 min | 3 min | −27 min | — |
| T03 | 30 min | 9 min | −21 min | — |
| T04 | 45 min | 16 min | −30 min | — |
| T05 | 45 min | 12 min | −34 min | — |
| T06 | 45 min | 12 min | −34 min | — |
| T07 | 30 min | 2 min | −28 min | — |
| T08 | 25 min | 3 min | −22 min | — |
| T09 | 40 min | 9 min | −32 min | — |
| T10 | 30 min | 5 min | −25 min | — |
| T11 | 20 min | 9 min | −12 min | — |
| T12 | 25 min | 4 min | −22 min | — |
| T13 | 30 min | 6 h 27 min | +5 h 57 min | — |
| T14 | 20 min | 5 min | −16 min | — |
| T15 | 40 min | 11 h 43 min | +11 h 3 min | — |
| T16 | 20 min | 50 min | +30 min | — |
| **Total** | 8 h 15 min | 20 h 27 min | | US$ 42.15 |

| Indicador | Valor |
|---|---|
| Tarefas feitas | 16/16 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 1.402 / 254.095 / 3.818.170 / 80.089.762 |
| Custo total | US$ 42.15 |
| Custo por agente | tech-lead US$ 21.35 · general-purpose US$ 6.81 · main-harness:reviewer US$ 13.84 · claude-code-guide US$ 0.15 |
| Retrabalho (ajustes pedidos por Daniel) | 4 |
| Reprovações do Reviewer | 3 |
| Alertas de contexto | 2 |
| Handoffs | 2 |

O custo por tarefa aparece como "—" (sem dado por tarefa). As sessões de eval (`claude -p`) ficam fora da conta, então o consumo real é maior que US$ 42.15.

## Revisão

- **Reviewer:** 3 reprovações, todas na revisão de segurança (ver T13 acima). Todas as tarefas terminaram aprovadas.
- **Critérios de aceite:** 16 de 16 tarefas feitas. O `hx doctor` dá 15/15 no Dashboard IA. Rollback real: não testado (só havia uma versão), coberto por teste automático. `frontend-design`: não atendido, saiu do catálogo (B007).
- **Lint e tipos:** zero erros e zero avisos (`npm run check`).

## Retorno de Daniel

Teste no Dashboard IA (retrabalho pedido por Daniel; o `hx` conta 4 ajustes):

- v0.1.0: o `attach` funcionou.
- 2º chat: `hx` fora do PATH (a pasta `bin/` do plugin não entra no PATH no Windows) e pasta sem git, com o `index.md` listando `.remember`.
- v0.1.1: `hx setup` instala atalhos em `~/.harness/bin` e põe no PATH do usuário; o `doctor` confere; o `attach` cria o git na `main` e faz o 1º commit.
- v0.1.2: o atalho `sh` usa caminho `C:/` e funciona em qualquer bash.
- v0.1.3: o `hx release` roda `claude plugin update` em cada projeto de `projects.json`, porque o Claude Code guarda uma cópia do plugin por versão. ADR 0001 e ADR 0004 revisados.
- Resultado: `hx doctor` 15/15 no Dashboard IA.

## Retrospectiva

- **Comparação com sprints anteriores:** sem base (primeira sprint).
- **O que funcionou:** execução em paralelo com clones (T03 a T06 em cerca de 15 min); 13 das 16 tarefas terminaram abaixo do planejado; o teste real no Dashboard IA achou falhas que os testes automáticos não pegaram.
- **O que não funcionou:** o consumo. O limite de uso estourou 3 vezes (a última durante este Release Report) e inflou T13 e T15. 44 processos `claude` em paralelo sobrecarregaram a máquina (paralelismo de eval limitado a 3), e apareceu aviso de `.claude.json` corrompido durante as execuções paralelas (o Claude Code salvou um backup). O `run_eval.py` não roda no Windows. A instalação no Windows só foi validada de verdade no teste de Daniel.
- **Oportunidades de melhoria no harness:** todas já estão no backlog (`docs/backlog.md`):
  - B006 (alta): reduzir consumo. Reviewer no Sonnet para rotina; evals no Sonnet (Daniel decidiu não usar Haiku, para não perder qualidade), 1 rodada por consulta; contar as sessões de eval no `hx usage`. Justificativa: US$ 42 medidos e 3 estouros de limite.
  - B007 (média): voltar `frontend-design` ao catálogo (caso 1 falhou 3 vezes).
  - B004 (média): remover duplicações apontadas na revisão (Ponytail).
  - B005 (baixa): retomada automática após o limite, bloqueada pelo classificador.
  - B001 a B003: itens do roadmap, sem mudança.
  - A registrar: acentos trocados na saída do PowerShell 5.1 (só exibição). Falta o item no backlog.
  - Backlog aberto ao fim da sprint: B001 a B007. Nenhum `hx request` novo foi criado neste relatório (o `inbox/` não existe no repo).

## CHANGELOG

Já atualizado pelos `hx release` das versões 0.1.0 a 0.1.3. Nada a mudar neste relatório.
