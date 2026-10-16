---
description: Executa uma sprint aprovada (em chat novo) até a entrega para Daniel testar
argument-hint: "SNN"
---

Execute a sprint $ARGUMENTS. Toda mensagem a Daniel começa com `[TNN] Título curto:` (o que está fazendo e, se ajudar, o porquê); fora de tarefa (abertura, onda, entrega), `[SNN]`.

1. `hx sprint open $ARGUMENTS` (falha se o plano não estiver aprovado ou tiver mudado). Republique a lista que ele imprime e crie a lista nativa de tarefas do Claude Code com as mesmas tarefas.
2. Ordem e paralelismo: tarefas com arquivos que não se cruzam rodam em clones (`main-harness:tech-lead`) com handoff (skill `handoff`). As outras, você mesmo.
3. Cada tarefa: `hx task start TNN` → TDD (`tdd-workflow`) → lint/tipos zerados → Reviewer → corrigir até `pass` → **um commit na main** → `hx task done TNN`. Republique a lista a cada start/done e atualize a lista nativa.
   - **Reviewer** (`main-harness:reviewer`, Sonnet): uma revisão por onda, cobrindo as tarefas entregues nela (`hx review` continua por tarefa). Tarefa que toca superfície de segurança (hooks, pre-bash, attach, release, entrada externa): chame com `model: opus`. Correção é re-revisada pelo mesmo Reviewer (SendMessage). Máximo de 2 reprovações por tarefa; na 3ª ele escala a você.
4. Todas prontas: resumo curto para Daniel testar (o que mudou, como testar). Cada ajuste pedido: `hx sprint feedback 1` e volta ao passo 3.
5. Daniel confirmou que está completo e sem ajustes: `hx sprint close $ARGUMENTS` e `/main-harness:release-report $ARGUMENTS`.
