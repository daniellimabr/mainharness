# S04 — Release Report: Guardas, tempos e estimativa calibrada (v0.5.0)

## Resumo da entrega

- **v0.5.0 publicada** (`hx release minor`): versão estável e plugins dos 2 projetos atualizados. Daniel confirmou no Dashboard: `hx doctor` mostra 0.5.0.
- Guardas novas:
  - O `pre-bash` nega `cd /c/...` e pergunta antes de um commit com o bundle desatualizado.
  - O hook `pre-edit` bloqueia edição de `cli/dist/hx.js` e de `C:\harness-stable`.
  - O Stop roda o typecheck quando `cli/src` mudou.
- Tempos mais honestos:
  - Pausas acima de 30 min saem do tempo corrido.
  - O tempo até a revisão aparece separado.
  - As rodadas de ajuste são medidas.
  - A linha Total mostra o fim previsto.
- `hx eval --failed` repete só os casos que falharam.
- A `sprint-plan` estima com o fator real/planejado das sprints anteriores.
- Os agentes leem, buscam e editam arquivos só pelas ferramentas próprias. O shell não usa `cd` nem caminhos `/c/`.
- O `index.md` não tem mais linhas duplicadas.
- O projeto libera comandos só de leitura sem pedir permissão.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | B042 (causa + correção ou orientação), B041 (hook nega `cd /c/`), B024 (commit com bundle velho) no `pre-bash` | clone A | 15 min | 20:42 | 21:01 | 20 min |
| ✅ | T02 | B023: hook `pre-edit` | clone B | 10 min | 20:42 | 21:01 | 20 min |
| ✅ | T03 | B026: Stop roda typecheck quando `cli/src` mudou | clone C | 10 min | 20:42 | 21:01 | 20 min |
| ✅ | T04 | B035, B037, B040, B043: tempo até a revisão, pausas, rodadas de ajuste, fim previsto | clone D | 20 min | 20:42 | 21:01 | 20 min |
| ✅ | T05 | B036: `hx eval --failed` | clone E | 15 min | 20:42 | 21:01 | 20 min |
| ✅ | T06 | B025: `index.md` sem duplicadas (causa + limpeza) | clone F | 8 min | 20:42 | 21:01 | 20 min |
| ✅ | T07 | B041: regra de ferramentas de arquivo nos prompts e no handoff (+ orientação do B042, se externo) | tech-lead | 8 min | 20:46 | 21:01 | 16 min |
| ✅ | T08 | B039: estimativa calibrada na `sprint-plan` | clone G | 10 min | 20:42 | 21:02 | 20 min |
| ✅ | T09 | B027: liberar comandos de leitura (`fewer-permission-prompts`) | tech-lead | 5 min | 20:42 | 22:34 | 40 min |
| ✅ | T10 | Validação real: `hx eval handoff` e `hx eval sprint-plan` (com `--failed` para repetir) | reviewer | 15 min | 21:02 | 21:11 | 9 min |
| ✅ | T11 | Revisão final, backlog, CHANGELOG e release v0.5.0 (`hx release minor`) | tech-lead + reviewer | 10 min | 22:34 | 22:52 | 18 min |
| ✅ | **Total** | 11 tarefas |  | 48 min | 2026-10-18 20:42 | 2026-10-18 22:52 | 58 min (pausas: 1 h 12 min) |

## Observações por tarefa

- **T01–T08:** onda única com 7 clones e o Tech Lead em paralelo, todas prontas entre 20:42 e 21:02. Os 20 min de cada uma incluem a espera pela revisão da onda.
- **T09:** 40 min contra 5 planejados. O trabalho em si levou poucos minutos. O resto foi bloqueio: o modo auto do Claude Code negou o `hx` como "Self-Modification", mesmo com `Bash(hx *)` liberado. Isso acontece porque o classificador do modo auto não lê o `permissions.allow` do projeto e protege a pasta `.claude/`. A solução foi Daniel colar uma regra `autoMode.allow` no `~/.claude/settings.json` dele (B044).
- **T10:** reprovada 1 vez. O juiz não via os prompts dos subagentes. Depois da correção, os evals de `handoff` e `sprint-plan` passaram.
- **T11:** o `hx release minor` também foi bloqueado pelo modo auto, desta vez como "Production Deploy". Rodou depois do OK explícito de Daniel. Esse bloqueio é correto e fica assim.

## Indicadores

### Indicadores — S04

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 15 min | 20 min | +5 min | — |
| T02 | 10 min | 20 min | +10 min | — |
| T03 | 10 min | 20 min | +10 min | — |
| T04 | 20 min | 20 min | −0 min | — |
| T05 | 15 min | 20 min | +5 min | — |
| T06 | 8 min | 20 min | +12 min | — |
| T07 | 8 min | 16 min | +8 min | — |
| T08 | 10 min | 20 min | +10 min | — |
| T09 | 5 min | 40 min | +35 min | — |
| T10 | 15 min | 9 min | −6 min | — |
| T11 | 10 min | 18 min | +8 min | — |
| **Total** | 2 h 6 min | 3 h 41 min (soma) | | US$ 12.46 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 48 min · 58 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 1 h 12 min |
| Soma das tarefas (planejada · real) | 2 h 6 min · 3 h 41 min |
| Tarefas feitas | 11/11 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 62.467 / 98.918 / 1.353.158 / 22.047.488 |
| Custo total | US$ 12.46 |
| Custo por agente | tech-lead US$ 5.49 · main-harness:tech-lead US$ 3.14 · main-harness:reviewer US$ 1.77 · eval US$ 2.06 · claude-code-guide US$ 0.00 |
| Retrabalho (ajustes pedidos por Daniel) | 0 |
| Rodadas de ajuste (quantidade · tempo · custo) | 0 · 0 min · US$ 0.00 |
| Reprovações do Reviewer | 1 |
| Alertas de contexto | 0 |
| Handoffs | 0 |

## Revisão

- Revisão da onda e revisão final com o Reviewer. Na final ele usou Opus, porque T01, T02 e T03 mexem nos hooks.
- Reprovação: T10 (1). Nenhuma tarefa chegou ao limite.
- Segurança (T01, T02, T03): nenhum achado. Os hooks foram testados pelo bundle real com caminhos com espaço, letras maiúsculas e minúsculas e `HARNESS_HOME` inválido. Nada passa por shell.
- Três achados baixos foram para o backlog:
  - B046: `git diff --output=` grava sem perguntar.
  - B047: redirecionamento `>` para `cli/dist`.
  - B048: o typecheck do Stop não confere se está no repo do harness.

## Retorno de Daniel

- Pediu que conflitos de permissão como o da T09 não se repitam. Ele mesmo colou a regra `autoMode.allow` no `~/.claude/settings.json`, e o `hx` voltou a rodar (B044 leva isso ao `hx setup`).
- Pediu para contabilizar o tempo ocioso causado pela demora nas respostas dele (B045).
- Aprovou a sprint sem ajustes.

## Retrospectiva

| Indicador | S01 | S02 | S03 | S04 |
|---|---|---|---|---|
| Tempo corrido | 45 min | 30 min | 4 h 17 min | 58 min (+1 h 12 min de pausas) |
| Tempo previsto (relógio) | sem dado | 55 min | 45 min | 48 min |
| Soma das tarefas (planejada · real) | 4 h · 1 h 58 min | 2 h 20 min · 1 h 14 min | 1 h 50 min · 6 h 47 min | 2 h 6 min · 3 h 41 min |
| Custo | US$ 16.32 | US$ 11.55 | US$ 26.65 | US$ 12.46 |
| Retrabalho (ajustes de Daniel) | 1 | 1 | 0 | 0 |
| Reprovações do Reviewer | 3 | 1 | 2 | 1 |

**O que funcionou**
- A estimativa calibrada acertou o relógio: 48 min previstos contra 58 min reais, um erro de 21%. Na S03 o tempo real foi 5,7× o previsto.
- Os evals caíram de US$ 16.83 (S03) para US$ 2.06, com o `--failed` e o escopo enxuto.
- 8 tarefas em paralelo numa onda só, sem conflito de arquivos.
- Zero ajustes pedidos por Daniel pela segunda sprint seguida.

**O que não funcionou**
- O modo auto bloqueou o `hx` e a edição de `.claude/`, e a T09 ficou parada até Daniel colar a regra. Projetos novos vão cair no mesmo bloqueio (B044).
- O tempo esperando a resposta de Daniel cai em "pausas" quando passa de 30 min e some no corrido quando é mais curto. Assim não dá para separar a espera por Daniel do trabalho dos agentes (B045).
- A soma das tarefas continua inflada pela espera da revisão da onda: 8 tarefas aparecem com cerca de 20 min cada.

## Melhorias do harness (pedidos)

Como esta sprint roda no próprio repo do harness, os itens entraram direto no backlog, sem passar pelo inbox:

- Alta: B044, fazer o `hx setup` escrever a regra `autoMode.allow` e o `hx doctor` conferir. Justificativa: 35 min perdidos na T09 e uma intervenção manual de Daniel.
- Média: B045, separar o tempo ocioso esperando Daniel do tempo de trabalho. Justificativa: 1 h 12 min de pausa nesta sprint sem saber de quem era a espera.
- Baixa: B046–B048, achados baixos do Reviewer nos hooks.

## CHANGELOG

Seção `[0.5.0]` gerada pelo `hx release` em `CHANGELOG.md`.
