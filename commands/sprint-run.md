---
description: Executa uma sprint aprovada (em chat novo) até a entrega para Daniel testar
argument-hint: "SNN"
---

Execute a sprint $ARGUMENTS. Toda mensagem a Daniel começa com `[TNN] Título curto:` (o que está fazendo e, se ajudar, o porquê); fora de tarefa (abertura, onda, entrega), `[SNN]`.

0. Modelo (ADR 0013): a execução roda em Sonnet. Se você não está em Sonnet, avise Daniel em uma linha para abrir um chat novo com Sonnet no seletor (não troque sozinho: relê o contexto sem cache) e siga.
1. `hx sprint open $ARGUMENTS` (falha se o plano não estiver aprovado ou tiver mudado). Republique a lista que ele imprime e, se a ferramenta existir nesta interface, crie a lista nativa de tarefas do Claude Code com as mesmas tarefas; senão a lista do `hx` basta.
2. Ordem e paralelismo: tarefas com arquivos que não se cruzam rodam em clones (`main-harness:executor`) com handoff (skill `handoff`), no modelo da coluna Agente do plano. As outras, você mesmo. Tarefa que apaga módulo: na abertura da onda, antes de chamar os clones, tire o import do roteador (ex.: `cli/src/index.ts`) e rebuilde, senão os testes dos outros clones quebram.
3. Cada tarefa: `hx task start TNN` → TDD (`tdd-workflow`) → lint/tipos zerados → Reviewer → corrigir até `pass` → **um commit na main** (`<tipo>(SNN/TNN): <resumo>`, tipo `feat`, `fix`, `docs`, `chore`, `refactor` ou `test`) → `hx task done TNN`. A cada troca de fase, `hx task phase TNN testes|código|fila|revisão|commit` (a fase aparece na linha 🔄). O clone roda `hx task phase TNN fila` na hora da entrega e o Reviewer roda `hx task phase TNN revisão` ao começar: a duração da tarefa vai até a entrega, e fila e revisão aparecem à parte. Republique a lista a cada start/done e atualize a lista nativa, se ela existir.
   - **Reviewer** (`main-harness:reviewer`, sempre com `model: opus`): uma revisão por onda, cobrindo as tarefas entregues nela (`hx review` continua por tarefa). Correção é re-revisada pelo mesmo Reviewer (SendMessage). Máximo de 2 reprovações por tarefa; na 3ª ele escala a você.
4. Todas prontas: resumo curto para Daniel testar (o que mudou, como testar). Cada ajuste pedido: `hx sprint feedback 1` e volta ao passo 3.
5. Daniel confirmou que está completo e sem ajustes: `hx sprint close $ARGUMENTS` e `/main-harness:release-report $ARGUMENTS`.
