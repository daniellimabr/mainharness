# Origem

- **Repo:** https://github.com/anthropics/skills
- **Caminho:** `skills/frontend-design/`
- **Commit de origem:** `41bbe19d1a1a7eaab5e7bb9050a417e5c6cffc8f` (03/09/2026)
- **Licença:** Apache 2.0 — `LICENSE.txt` nesta pasta.
- **Alinhada em:** 2026-10-22 (S09/B075)

## Diferenças do oficial (Main Harness)

1. **Descrição:** a nossa, ajustada para os evals de acionamento (`evals/trigger.json`).
2. **Seção "Show the visual plan":** pede o plano visual (direção, tipo, cor, layout, revisão) na resposta, antes do código (eval caso 1, B007).
3. **Duas frases em "More on writing in design":** rótulo sem verbo ("Novo") ganha um ("Adicionar gasto"); ao renomear uma ação, atualizar todos os textos do fluxo que a nomeiam, inclusive os que já estão no código. Sem elas, o caso 2 dos evals falha (S09: botão sem verbo e confirmação com o nome antigo).
4. **Na seção do plano visual:** o plano vem completo na resposta final, mesmo que já tenha aparecido antes (S09: caso 1 falhava com "o plano acima").

O resto do corpo é igual ao oficial. Catálogo opcional: o `/attach` copia para `.claude/skills/` só em projetos web (ADR 0005), e o `hx migrate` recopia nos projetos que já a têm (B074).
