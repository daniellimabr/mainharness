# Origem

- **Repo:** https://github.com/affaan-m/ECC (Everything Claude Code)
- **Caminho:** `skills/tdd-workflow/SKILL.md`
- **Commit de origem:** `b92f181b3b748d1abbc2afd94af6aa7d8c8fca29`
- **Licença:** MIT (Copyright (c) 2026 Affaan Mustafa) — cópia em `LICENSE` nesta pasta.
- **Copiado em:** 2026-10-15

## Adaptações (Main Harness)

- Um commit por tarefa da sprint, em vez de commits de checkpoint por etapa (RED/GREEN/refactor).
- Removida a dependência de scripts do ECC (`scripts/setup-package-manager.js`); o executor é descoberto lendo o projeto e os comandos rodam via `hx run`.
- Entrada passa a ser o sprint plan (`docs/sprints/SNN-plan.md`): tarefa, critérios de aceite e plano de testes; inclui orientação para escrever o plano de testes do sprint plan.
- Relatório de evidências vira um relatório curto ao Tech Lead (sem arquivo em `docs/releases/`).
- Removidos exemplos específicos (Supabase, Redis, OpenAI, Bun, CI/CD) e reduzido o texto, para economizar contexto.
- Texto em português.
