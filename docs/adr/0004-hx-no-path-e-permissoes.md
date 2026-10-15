# ADR 0004 — `hx` disponível como comando e permissões

- **Status:** aceito
- **Data:** 2026-10-15

## Contexto

Os agentes rodam `hx task`, `hx sprint`, `hx request` etc. O `hx request` grava fora do repo do projeto (`C:\Main Harness\inbox\`), e todos os comandos gravam em `%USERPROFILE%\.harness\`.

## O que a documentação diz

- Arquivos na pasta `bin/` de um plugin ativo entram no `PATH` da ferramenta Bash; o agente chama pelo nome.
- As variáveis `CLAUDE_PLUGIN_ROOT` **não** existem no ambiente da ferramenta Bash.
- Regras de permissão de leitura/edição valem para as ferramentas `Read`/`Edit`/`Write`. Caminho absoluto do Windows vira `//c/...` nas regras.
- `permissions.allow` e `additionalDirectories` do `.claude/settings.json` do projeto só valem depois que a pasta é marcada como confiável.

## Decisão

- `bin/hx` (script sh para Git Bash) e `bin/hx.cmd` (para PowerShell/cmd), os dois chamando `node "<raiz do plugin>/cli/dist/hx.js"` com o caminho resolvido a partir da própria pasta do script.
- As gravações fora do repo são feitas pelo processo `node` do `hx`, não pelas ferramentas `Edit`/`Write`. Por isso basta uma regra de comando.
- O `/attach` grava no `.claude/settings.json` do projeto: `"permissions": {"allow": ["Bash(hx *)", "PowerShell(hx *)"]}`.
- Agentes nunca usam `Edit`/`Write` em `C:\Main Harness\inbox\` nem em `.harness\`; sempre via `hx`.

## Consequências

- Uma única regra cobre todas as gravações externas, e o `pre-bash` continua vigiando o resto.
- Se `bin/` no PATH falhar no Windows (validação na T14), plano B: os comandos e skills chamam `node "${CLAUDE_PLUGIN_ROOT}/cli/dist/hx.js"`, que é substituído no texto da skill.
