# ADR 0005 — Catálogo opcional ligado por cópia no `/attach`

- **Status:** aceito
- **Data:** 2026-10-15

## Contexto

`webapp-testing` e `frontend-design` só devem existir (e ocupar contexto) em projetos web.

## O que a documentação diz

- A descrição de toda skill visível fica sempre no contexto; o conteúdo só carrega quando a skill é usada.
- `skillOverrides` (`"off"`) esconde skills, mas **não afeta skills de plugin**.
- Skills de plugin só podem ser ligadas/desligadas junto com o plugin inteiro.
- O scan padrão do plugin lê `skills/<nome>/SKILL.md`; uma pasta `skills/optional/<nome>/` não é carregada automaticamente.
- Skills em `.claude/skills/` do projeto são carregadas por projeto.

## Decisão

- O catálogo opcional fica em `skills/optional/` no plugin, fora do scan (não aparece em nenhum projeto por padrão).
- O `/attach` detecta projeto web (dependência como `react`, `vue`, `next`, `vite`, `svelte`, `express`, `fastify`, `koa`, `hono`, `@angular/core`; ou `index.html` na raiz/`public`/`src`). Se for web, copia as skills para `<projeto>/.claude/skills/<nome>/` e registra em `.claude/harness.json` → `optionalSkills: ["webapp-testing","frontend-design"]` com a versão do harness.
- `hx skills on|off <nome>` liga/desliga manualmente (copia/apaga a pasta e atualiza o `harness.json`).
- O `hx migrate` atualiza as cópias quando a versão do harness muda.

## Consequências

- Projetos não web não pagam contexto por essas skills.
- As cópias são arquivos do projeto e entram no git dele; a atualização depende da migração (aceitável).
