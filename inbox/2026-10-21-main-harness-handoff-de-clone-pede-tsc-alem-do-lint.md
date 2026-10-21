# Pedido ao harness: Handoff de clone pede tsc além do lint

- **Projeto:** main-harness
- **Data:** 2026-10-21
- **Sprint:** —
- **Prioridade:** baixa

## O que precisa

Template do handoff (skill handoff / agente tech-lead) inclui rodar tsc --noEmit no critério de pronto do clone

## Por quê

S06: dois clones (T02, T07) entregaram findLast, que não existe no lib do projeto; o Stop hook do Tech Lead bloqueou 2 vezes por erros de tipo de clones em andamento

## Exemplo

Critério de pronto: testes do arquivo + lint + hx run npx tsc --noEmit -p cli
