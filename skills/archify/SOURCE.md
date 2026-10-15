# Origem

- **Repo:** https://github.com/tt-a1i/archify
- **Caminho:** `archify/` (pasta da skill)
- **Commit de origem:** `d0c8c7e9f4e06f303389f804208d387f27019ef5` (Archify 3.1.0)
- **Licença:** MIT (Copyright (c) 2026 tt-a1i) — `LICENSE` e `THIRD_PARTY_NOTICES.md` nesta pasta.
- **Copiado em:** 2026-10-15

## O que foi copiado

Tudo o que a skill usa em tempo de execução: `SKILL.md`, `bin/`, `renderers/`, `schemas/`, `references/`, `assets/`, `brand-marks/`, `delta/`, `locales/`, `migrations/`, `recipes/`, `scripts/`, `package.json`, `skill-release.json`.

De `examples/`, só os arquivos `.json` citados pelo `SKILL.md` (os exemplos renderizados, ~13 MB, ficaram de fora). `node bin/archify.mjs doctor` passa sem `npm install` (não há dependências de execução).

Sem alterações no conteúdo. Uso no harness: o Writer gera diagramas para ADRs e PRDs (saída HTML interativa).
