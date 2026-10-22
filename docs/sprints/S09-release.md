# S09 — Release Report

## Resumo da entrega

A sprint publicou a v0.8.2:

- A gravação atômica (`writeFileAtomic`) tenta de novo, até 5 vezes em ~0,2 s, quando o Windows trava o arquivo (`EPERM`, `EBUSY`, `EACCES`). Outros erros sobem na hora. Se todas as tentativas falharem, o `.tmp` é apagado.
- O `hx migrate` recopia do catálogo as skills opcionais que o projeto já tem em `.claude/skills/`, mesmo fora de `optionalSkills`. Assim, o Dashboard IA recebe a `frontend-design` nova.
- A `frontend-design` está alinhada à oficial (`anthropics/skills@41bbe19`), com 4 diferenças listadas no `SOURCE.md`. O plano previa 2.
- Em tarefa de tela, o Tech Lead chama a `frontend-design` antes do código. O Reviewer confere o plano visual, o tema escuro, o foco do teclado e os estados vazio e de erro. A versão para celular ficou fora, por pedido de Daniel.

## Execução

Horários de Brasília (UTC−3). ✅ feita · 🔄 em andamento · ⬜ a fazer.

| Status | Id | Tarefa | Agente | Planejado | Início | Fim | Duração |
|---|---|---|---|---|---|---|---|
| ✅ | T01 | B073: gravação atômica tenta de novo com arquivo travado no Windows | clone A | 6 min | 09:56 | 10:03 | 2 min (fila: 4 min, revisão: 2 min) |
| ✅ | T02 | B074: `hx migrate` recopia as skills opcionais ligadas no projeto | clone B | 8 min | 09:56 | 10:03 | 2 min (fila: 4 min, revisão: 2 min) |
| ✅ | T03 | B075: `frontend-design` alinhada à oficial + evals | tech-lead | 8 min | 09:56 | 10:46 | 49 min (fila: 0 min, revisão: 1 min) |
| ✅ | T04 | B076: tarefa de tela chama a `frontend-design` e o Reviewer confere | tech-lead | 4 min | 09:57 | 10:03 | 1 min (fila: 3 min, revisão: 2 min) |
| ✅ | T05 | Backlog (B073–B076), CHANGELOG e release v0.8.2 (`hx release patch`) | tech-lead + reviewer | 6 min | 10:04 | 10:55 | 51 min |
| ✅ | Ajuste 1 | 1 ajuste(s) |  |  | 10:49 | 10:55 | 6 min |
| ✅ | **Total** | 5 tarefas |  | 14 min | 2026-10-22 09:56 | 2026-10-22 10:55 | 59 min |

## Observações por tarefa

- **T01 e T02 (clones):** cada uma ficou pronta em ~2 min, com o teste falhando antes da mudança (RED). Na revisão, entraram duas melhorias baixas: o `.tmp` é apagado quando todas as tentativas falham, e o teste fixa as 5 tentativas.
- **T03:** precisou de 8 rodadas de eval. A 1ª deu 1/3. Nas seguintes, cada caso falhou por um motivo diferente:
  - **Caso 1:** o plano visual ficou só numa mensagem antes do código.
  - **Caso 2:** a skill não foi chamada; depois, a confirmação manteve o nome antigo; depois, o botão ficou sem verbo.
  - **Caso 3:** a skill não foi chamada.

  Mudanças que ficaram:
  - a descrição cita estados vazio e de erro de tela existente (acionamento 15/15);
  - a frase sobre renomear ações voltou, porque sem ela o caso 2 falha;
  - entrou a regra "rótulo sem verbo ganha um";
  - o plano visual vem completo na resposta final.

  Ficou em discussão rodar cada caso 3 vezes e valer a maioria. Daniel recusou, porque triplicaria o custo. A última rodada usou `--failed`, só no caso 3, porque os casos 1 e 2 já tinham passado com o mesmo texto (mesmo hash).
- **T04:** entregue em 1 min. O ajuste de Daniel tirou o celular da conferência do Reviewer.
- **T05:** o tempo de 51 min está inflado. Abri a tarefa às 10:04, antes da T03 terminar, e ela ficou aberta esperando. O `hx release` recusou a 1ª tentativa por causa do `S09-release.md` e de 5 pedidos novos no inbox sem commit, o mesmo caso da S08. Logo depois, o modo auto negou um `git status` no PowerShell como "Production Deploy".

## Indicadores

| Tarefa | Planejado | Real | Diferença | Custo |
|---|---|---|---|---|
| T01 | 6 min | 2 min (fila: 4 min, revisão: 2 min) | −5 min | — |
| T02 | 8 min | 2 min (fila: 4 min, revisão: 2 min) | −6 min | — |
| T03 | 8 min | 49 min (fila: 0 min, revisão: 1 min) | +41 min | — |
| T04 | 4 min | 1 min (fila: 3 min, revisão: 2 min) | −4 min | — |
| T05 | 6 min | 51 min | +45 min | — |
| **Total** | 32 min | 1 h 44 min (soma) | | US$ 15.42 |

| Indicador | Valor |
|---|---|
| Tempo de relógio (previsto · corrido) | 14 min · 59 min |
| Pausas (mais de 30 min sem eventos, fora do corrido) | 0 min |
| Espera por Daniel (fim da vez do agente até o próximo comando) · trabalho (corrido sem as esperas dentro dele) | 34 min · 25 min |
| Soma das tarefas (planejada · real) | 32 min · 1 h 44 min |
| Tarefas feitas | 5/5 |
| Tokens (entrada / saída / escrita em cache / leitura de cache) | 215.080 / 445.744 / 1.942.458 / 15.914.885 |
| Custo total (estimado: a assinatura não cobra por token) | US$ 15.42 |
| Custo por agente | tech-lead US$ 2.79 · main-harness:tech-lead US$ 0.60 · eval US$ 11.41 · main-harness:reviewer US$ 0.62 |
| Retrabalho (ajustes pedidos por Daniel) | 1 |
| Rodadas de ajuste (quantidade · tempo · custo) | 1 · 6 min · US$ 0.18 |
| Reprovações do Reviewer | 0 |
| Alertas de contexto | 0 |
| Handoffs | 0 |

O eval custou US$ 11.41, ou 74% da sprint, em 8 rodadas da `frontend-design`. A "espera por Daniel" (34 min) inclui as rodadas de eval que rodaram enquanto eu falava com ele.

## Revisão

Uma revisão para a onda 1, no Opus, porque a T02 escreve em pastas de projeto. A T03 e o ajuste da T04 foram re-revisados pelo mesmo Reviewer. Não houve reprovações.

- **T02:** os nomes que entram vêm de `readdirSync` (um nível, sem `..`). Só são recopiadas as pastas que existem no catálogo. Link simbólico é removido sem tocar o alvo.
- **T03:** o Reviewer conferiu que o `SOURCE.md` bate com o diff real contra o oficial e que o hash do `results.json` bate com a skill atual.

Pontos baixos que não bloquearam:

- Os nomes em `hj.optionalSkills` vêm do `harness.json` sem validação. Um `../x` sairia da pasta. O risco já existia antes da tarefa, e o arquivo é escrito pelo `hx`.
- Uma cópia de skill do catálogo editada à mão no projeto passa a ser sobrescrita na migração. É o que o B074 pede.

Critérios de aceite:

1. `EPERM` 2× e depois passa grava o arquivo. `EPERM` sempre sobe o erro, depois de 5 tentativas. `ENOENT` falha na 1ª: atendido (`fsx.test.ts`).
2. Skill antiga fica igual à do catálogo, skill não ligada fica fora e skill de fora do catálogo fica intacta: atendido (`migrate.test.ts`).
3. Corpo igual ao oficial, com as diferenças no `SOURCE.md`, e evals passando: atendido, com 4 diferenças em vez de 2 (acionamento 15/15, casos 3/3).
4. Regra de tela no `tech-lead.md` e no `reviewer.md`: atendido. A chamada da skill no Dashboard IA só se confere na próxima sprint com tela.
5. Lint e tipos: zero erros e zero avisos (`npm run check`, 457 testes).

O teste de ponta a ponta (abrir uma sessão no Dashboard IA com a v0.8.2) fica com Daniel.

## Retorno de Daniel

- Recusou rodar cada caso do eval 3 vezes: o custo extra invalidava a decisão. Escolheu o `--failed`, que já existia.
- Pediu que a versão para celular não seja priorizada nem testada (ajuste 1, na T04).
- Notou que eu passei a responder em inglês em parte da conversa. Voltei ao português.
- Liberou a release ("pode").

## Retrospectiva

### Comparação

| Indicador | S07 | S08 | S09 |
|---|---|---|---|
| Relógio (previsto · corrido) | 36 min · 52 min | 16 min · 33 min | 14 min · 59 min |
| Trabalho efetivo | 19 min | 13 min | 25 min |
| Soma (planejada · real) | 1 h 3 min · 1 h 13 min | 35 min · 26 min | 32 min · 1 h 44 min |
| Custo | US$ 11.44 | US$ 3.40 | US$ 15.42 |
| Retrabalho | 0 | 0 | 1 |
| Reprovações | 3 | 1 | 0 |
| Alertas de contexto | 0 | 0 | 0 |

- Sem a T03, as tarefas de código e de texto ficaram bem abaixo do plano (T01, T02 e T04: 5 min contra 18).
- A T03 sozinha explica a soma de 1 h 44 min e o custo 4,5× maior que o da S08. Como na S07, o que encarece a sprint é o eval de skill.
- O plano estimou a T03 como se o eval passasse de primeira. Com 1 rodada por caso e 3 casos, o 3/3 sai poucas vezes mesmo com uma skill boa.

### O que funcionou

- Os dois clones e o Tech Lead trabalharam em paralelo sem conflito. As três tarefas ficaram prontas e aprovadas em 7 min.
- O `--failed` reaproveitou os casos que tinham passado, porque o hash da skill era o mesmo, e destravou a release com custo de 1/3 de rodada.
- O Reviewer confirmou que o hash do `results.json` batia antes da release, e a release passou de primeira nesse ponto.

### O que não funcionou

- **Muitas rodadas de eval (8):** mudei o texto entre as rodadas, o que zerava o placar. Eu devia ter usado o `--failed` antes, que já cobre o caso "só um falhou".
- **T05 aberta cedo:** abri antes da T03 terminar, e a duração ficou distorcida.
- **`hx release` recusou a 1ª tentativa** pelo `SNN-release.md` e pelos pedidos do inbox sem commit. Foi o mesmo problema da S08, que já tem pedido no inbox.
- **Respondi em inglês** em parte da conversa.

### Melhorias do harness

- **B077** (já no backlog, baixa): eval menos sujeito ao acaso, rodando de novo só o caso que falha e valendo a maioria, sem triplicar o custo dos que passam. Números: 8 rodadas e US$ 11.41 na S09.
- [Modo auto nega git status logo após hx release falhar](../../inbox/2026-10-22-main-harness-modo-auto-nega-git-status-logo-apos-hx-release-falhar.md) (baixa)
- O pedido da S08 ([hx release não recusa pelo SNN-release.md da sprint aberta](../../inbox/2026-10-22-main-harness-hx-release-nao-recusa-pelo-snn-release-md-da-sprint-aberta.md)) se repetiu na S09. O caso dos pedidos novos no inbox entra junto.
