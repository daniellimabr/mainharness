---
description: Leva os pedidos do inbox do Main Harness para o backlog (só no repo do harness)
---

Processe o inbox do Main Harness (só faz sentido no repo `C:\Main Harness`):

1. Liste `inbox/*.md` (ignore `inbox/processed/`). Nada lá: diga "Inbox vazio." e pare.
2. Para cada pedido: acrescente uma linha em `docs/backlog.md` (id sequencial, item curto, origem `inbox: <arquivo>`, prioridade do pedido, status `novo`).
3. Mova os arquivos para `inbox/processed/` com `git mv`.
4. Um commit: `chore(inbox): move N requests to backlog`.
5. Resumo de uma linha por pedido para Daniel.
