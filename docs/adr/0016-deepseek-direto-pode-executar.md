# ADR 0016 — DeepSeek direto pode executar tarefa de clone

- **Status:** aceito por Daniel (2026-10-30), como opção pontual; o padrão segue sendo Sonnet
- **Data:** 2026-10-30
- **Harness:** 0.12.0
- **Revisa:** ADR 0015 (externos grátis não executam) e ADR 0014 (quem executa)

## Contexto

A S14 mostrou que o gargalo era a rota grátis do OmniRoute, não os modelos. Na S15 o `deepseek-v4-pro` foi chamado direto em `https://api.deepseek.com/anthropic`, com chave e crédito próprios (US$ 5). Passou no `hx worker check` novo (sonda pequena e de ~100 KB) e rodou os desafios 1, 2 e 3: nota 66 de 75 contra 67 do Sonnet, sem falha do provedor (`docs/experiments/S15-resultado.md`).

## Decisão

Aceitar `worker (deepseek)` na coluna Agente **pontualmente**: só em tarefa de código com handoff claro e teste de aceite, quando o limite do plano apertar ou a tarefa não bloquear a seguinte (a lentidão pesa menos), com Reviewer Sonnet. **Sonnet continua o padrão** e fica com contrato sensível, hooks e segurança. Custo medido: cerca de US$ 0,15 por tarefa (US$ 0,45 no painel para 3 corridas e a sonda). Gemini, GLM, Kimi e Argon continuam fora (sem teste ou sem camada grátis). B130 resolvido se aceito.

## Alternativas

- Manter o ADR 0015 (nenhum externo): descarta um executor fora do limite do Claude, com nota equivalente.
- Aceitar sem restrição de tipo: amostra de uma corrida por caso não sustenta.

## Consequências

- Tarefa de clone fora do limite de 5 h e semanal do Claude, ao custo do crédito DeepSeek (cerca de US$ 0,15 por tarefa).
- Mais lento (3 a 5 vezes) e com o Reviewer conferindo o aceite; o ruído de ambiente do aceite 0/N deve ser reproduzido antes de depender disso.
- Chave só em `~/.harness/config.json`.
