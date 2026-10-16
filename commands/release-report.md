---
description: Escreve o Release Report da sprint fechada (indicadores e retrospectiva)
argument-hint: "SNN"
---

Release Report da sprint $ARGUMENTS:

1. Pegue os indicadores com `hx metrics $ARGUMENTS` (ou a saída do `hx sprint close`).
2. Escreva você mesmo (ou um clone seu), com a skill `release-report`: entrega, tarefas, indicadores, revisão, retorno de Daniel e retrospectiva curta comparando com as sprints anteriores.
3. Cada oportunidade de melhoria **no harness** apontada na retrospectiva vira `hx request` com os números que a justificam.
4. Commit do `docs/sprints/$ARGUMENTS-release.md` (e do `CHANGELOG.md`, se mudou). Mensagem curta para Daniel com o link do arquivo.
