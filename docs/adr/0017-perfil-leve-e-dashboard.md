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

## Decisão (proposta, revista após a repetição)

1. **Dashboard continua ligado** (custo ≪ 2%, sem injeção sem uso).  fica como opção de emergência.
2. **O padrão do plugin não muda.** Em 27 corridas (3 por caso), atual 22,2, leve 22,8 e leve-plugins 23,3: sem perda de qualidade medida, mas a economia do leve-plugins é só 14% de tokens (custo igual) e a do leve puro (28%) vem com pior mínimo e 3 escondidos falhos. Os plugins companheiros ficam ligados.
3. O perfil leve puro é opção para projetos em que token pesa mais que risco; a decisão de torná-lo padrão é de Daniel.

## Consequências

- Nada muda no comportamento padrão do plugin.
- Se Daniel quiser o leve como padrão, nova sprint: mais corridas, medir o efeito do `~/.claude/CLAUDE.md` e da memória entre sessões.## Decisão (proposta, revista após a repetição de 27 corridas)

1. **Dashboard continua ligado** (custo ≪ 2%, sem injeção sem uso). HARNESS_DASHBOARD=off fica como opção de emergência.
2. **O padrão do plugin não muda.** Atual 22,2, leve 22,8 e leve-plugins 23,3: sem perda de qualidade medida, mas o leve-plugins poupa só 14% de tokens (custo igual) e o leve puro (28%) tem pior mínimo e 3 escondidos falhos. Os plugins companheiros ficam ligados.
3. Tornar o leve puro opção ou padrão é decisão de Daniel.

## Consequências

- Nada muda no comportamento padrão do plugin.
- Se Daniel quiser o leve como padrão: nova sprint com mais corridas, medindo também o efeito do ~/.claude/CLAUDE.md e da memória entre sessões.
