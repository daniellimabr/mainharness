# ADR 0001 — O repo é plugin e marketplace ao mesmo tempo

- **Status:** aceito
- **Data:** 2026-10-15
- **Harness:** pré-0.1.0 (S00)

## Contexto

O harness é distribuído como plugin do Claude Code a partir de um marketplace local em `C:\harness-stable`. Precisamos de uma versão estável separada da cópia em edição (`C:\Main Harness`).

## O que a documentação diz (code.claude.com, out/2026)

- Marketplace = pasta com `.claude-plugin/marketplace.json` (`name`, `owner`, `plugins[]`). A entrada aceita `source` relativo à raiz do marketplace.
- Plugin = `.claude-plugin/plugin.json` (só `name` é obrigatório) + componentes na raiz: `agents/`, `commands/`, `skills/<nome>/SKILL.md`, `hooks/hooks.json`, `bin/`, `settings.json`.
- **Marketplace adicionado de um caminho local com plugin de `source` relativo é carregado no lugar**, sem cópia para o cache. `CLAUDE_PLUGIN_ROOT` aponta para a pasta de origem. Mudanças valem no próximo chat ou com `/reload-plugins`, sem mexer na versão.
- `claude plugin validate <pasta>` é a checagem oficial do manifesto e do marketplace.
- O nome do plugin não pode começar com `claude-`/`anthropic-`.

## Decisão

- `marketplace.json` na raiz do repo, com uma entrada `main-harness` e `"source": "./"`. O repo é o plugin e o marketplace.
- Nome do marketplace: `harness-stable`. Id do plugin: `main-harness@harness-stable`.
- A versão fica só em `.claude-plugin/plugin.json` (fonte única). Para marketplace local ela não fixa cópia em cache, então serve como registro da versão publicada e é lida pelo `hx`.
- `C:\harness-stable` é um `git clone` de `C:\Main Harness`, sempre em checkout de uma tag (`vX.Y.Z`). O marketplace é registrado a partir dele (`claude plugin marketplace add "C:\harness-stable"`).
- `hx release` faz `git fetch --tags` + `git checkout <tag>` em `C:\harness-stable`. `hx rollback` faz checkout da tag anterior.

## Consequências

- Chats abertos continuam com os arquivos que já carregaram (hooks rodam `node` no caminho da pasta; um release no meio do chat troca os arquivos por baixo). Para evitar quebra, o `hx.js` é um arquivo único e o checkout troca tudo de uma vez. Risco aceito e registrado; a validação prática está na T14 da S00.
- Não há `npm install` no plugin: o `cli/dist/hx.js` é versionado já compilado.

## Revisão (S00, teste no Dashboard IA)

Na prática o Claude Code **não** lê o plugin direto de `C:\harness-stable`: guarda uma cópia por versão em `~/.claude/plugins/cache/harness-stable/main-harness/<versão>` para cada projeto. Por isso o `hx release`, depois de mover a cópia estável, roda `claude plugin update main-harness@harness-stable --scope project` em cada projeto de `projects.json`. A versão nova continua valendo no próximo chat.
