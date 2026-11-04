# ADR 0017 — Dashboard fica ligado; perfil leve como opção a confirmar

- **Status:** proposto (aguarda decisão de Daniel)
- **Data:** 2026-11-04
- **Harness:** 0.13.0

## Contexto

A S16 mediu o custo dos hooks do Dashboard (S13–S15) e rodou 3 desafios em 3 perfis com Sonnet e juiz cego (`docs/experiments/S16-resultado.md`).

## O que a documentação diz

O protocolo da S16 define: leve vale se ficar a até 2 pontos do atual e poupar ≥20% de tokens sem falhar segurança; o Dashboard só vale desligar se custar >~2% da sprint ou injetar contexto sem uso.

## Alternativas

- Desligar o Dashboard por padrão: poupa ~13–30 s por sprint e quase nenhum token; perde observação, e `stop`/`pre-compact` perdem tipos e alerta de contexto.
- Tornar o leve o padrão já: -41% de tokens, mas com uma corrida por caso e sem medir `~/.claude` do usuário.
- Manter tudo como está.

## Decisão (proposta)

1. **Dashboard continua ligado** (custo ≪ 2%, sem injeção sem uso). `HARNESS_DASHBOARD=off` fica como opção de emergência.
2. **Perfil leve** é opção, não padrão: nota igual (23,3 × 23,3), −41% tokens, −22% custo, −34% tempo. Antes de virar padrão, repetir 2 a 3 corridas por caso.

## Consequências

- Nada muda no comportamento padrão do plugin.
- Nova sprint pode validar o leve com mais corridas e medir também o efeito do `~/.claude/CLAUDE.md`.
