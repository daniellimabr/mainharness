# ADR 0014 — Regra "quem executa" revisada (resultado do experimento S12)

- **Status:** aceito
- **Data:** 2026-10-28
- **Harness:** 0.10.2
- **Revisa:** ADR 0013 (tabela de quem executa e do Reviewer) e ADR 0012 (Gemini desligado)

## Contexto

A S12 rodou os mesmos dois desafios em Opus, Sonnet e Gemini com nota cega (`docs/experiments/S12-resultado.md`). Opus venceu os dois. Sonnet foi o mais barato e rápido, mas errou um caso de borda em cada um (caminho de erro; dado lido de arquivo). Gemini estourou o tempo, saiu do escopo e estragou a codificação (BOM, acentos). Os dois Reviewers (Opus e Sonnet) deram o mesmo ranking; o Sonnet custou metade.

## Decisão

**Quem executa:**
- **Opus:** como na 0013, mais: código com caminho de erro ou que usa dado lido de arquivo ou do usuário.
- **Haiku:** só texto já decidido (docs, troca de frase), escopo fechado, até 3 arquivos, nada sensível; o Reviewer confere escopo e codificação. Substitui o Gemini onde ele serviria.
- **Sonnet:** todo o resto.
- **Gemini: desligado.** Lento e sem confiança para o harness, mesmo de graça. O código do `hx worker` e a skill `worker` ficam por ora (limpeza no backlog). Outros modelos do OmniRoute entram só depois de novo teste.

**Reviewer:** Sonnet na rotina; Opus em área sensível (hooks, `pre-bash`, release, token), contrato do `hx`, `security-review` e revisão final da sprint.

## Consequências

- Menos custo na rotina; Opus nos pontos onde o Sonnet errou.
- Base pequena (2 desafios, 1 corrida cada): repetir a comparação antes de apertar a regra.
- Haiku ainda não foi medido: avaliar na S13.
