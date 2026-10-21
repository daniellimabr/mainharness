# Sprint S01 — Slugs de pedidos

## Objetivo

Gerar slugs legíveis para os títulos dos pedidos.

## Critérios de aceite

- `slugify(title)` devolve tudo em minúsculas.
- Espaços viram hífen (`"Pedido Novo"` → `"pedido-novo"`).
- Acentos são removidos (`"Ação Rápida"` → `"acao-rapida"`).
- Lint e tipos: zero erros e zero avisos.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Estimativa |
|---|---|---|---|---|
| T01 | Modelo de pedido | tech-lead | src/order.ts | 20 min |
| T02 | Listagem de pedidos | clone | src/list.ts | 30 min |
| T03 | `slugify(title)` | tech-lead | src/slug.ts, src/slug.test.ts | 20 min |

## Plano de testes

| Critério | Teste | Tipo |
|---|---|---|
| Minúsculas | `slugify("ABC")` → `"abc"` | unitário |
| Espaço vira hífen | `slugify("Pedido Novo")` → `"pedido-novo"` | unitário |
| Sem acentos | `slugify("Ação Rápida")` → `"acao-rapida"` | unitário |
| Lint e tipos | `npm run lint` e `npm run typecheck` | comando |
