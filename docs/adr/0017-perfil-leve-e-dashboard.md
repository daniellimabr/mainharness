# ADR 0017 — Dashboard fica ligado; perfil leve como opção a confirmar

- **Status:** aceito (Daniel, 2026-11-04)
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

## Decisão

1. **Dashboard continua ligado** (custo ≪ 2%, sem injeção sem uso). HARNESS_DASHBOARD=off fica como opção de emergência.
2. **O padrão do plugin não muda e não existe perfil leve como opção.** Em 27 corridas, atual 22,2, leve 22,8 e leve-plugins 23,3: sem perda de qualidade medida, mas economia pequena (14% com plugins) ou com mais risco (28%, pior mínimo e 3 escondidos falhos). Daniel prefere o harness completo, com os plugins companheiros.
3. O perfil leve existe só no , como ferramenta de experimento.

## Consequências

- Nada muda no comportamento do plugin; o leve não é distribuído nem documentado para uso.
- Rever só se Daniel pedir.
