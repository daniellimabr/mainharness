---
description: Monta o sprint plan da próxima sprint a partir da conversa e pede aprovação a Daniel
argument-hint: "[SNN]"
---

Monte o sprint plan $ARGUMENTS com a skill `sprint-plan`:

1. Se houver arquivos em `inbox/` do harness ou pedidos pendentes, rode antes `/main-harness:inbox` (só no repo do Main Harness).
2. Leia `docs/backlog.md`, `docs/roadmap.md` e o último Release Report em `docs/sprints/`.
3. Escreva o plano você mesmo (ou, para ganhar tempo, um clone seu com um handoff curto do que foi combinado com Daniel); revise a tabela de tarefas (arquivos sem cruzamento entre tarefas paralelas).
4. Mostre a Daniel um resumo de poucas linhas e peça a aprovação. Aprovado: `hx sprint approve <id>` e diga para abrir um chat novo e rodar `/main-harness:sprint-run <id>`.
