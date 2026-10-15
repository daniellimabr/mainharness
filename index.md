# Mapa do repo

Uma linha por arquivo: caminho e propósito. Mantido pelo hook `post-edit`.

## Arquivos

- `.claude-plugin/marketplace.json` — marketplace local `harness-stable` (o repo é o próprio plugin)
- `.claude-plugin/plugin.json` — manifesto do plugin; fonte única da versão
- `CLAUDE.md` — regras deste repo para os agentes
- `cli/build.mjs` — bundle do hx em arquivo único (`cli/dist/hx.js`)
- `cli/tsconfig.json` — TypeScript estrito do CLI
- `docs/adr/0001-plugin-e-marketplace.md` — ADR: repo é plugin e marketplace
- `docs/adr/0002-agente-da-sessao-principal.md` — ADR: Tech Lead como sessão principal
- `docs/adr/0003-hooks-no-windows.md` — ADR: hooks em forma exec chamando o hx
- `docs/adr/0004-hx-no-path-e-permissoes.md` — ADR: hx no PATH e permissões
- `docs/adr/0005-skills-opcionais-por-projeto.md` — ADR: catálogo opcional por cópia
- `docs/adr/0006-continuacao-aos-250k.md` — ADR: compactação gerenciada aos 250K
- `docs/adr/0007-consumo-via-transcripts.md` — ADR: consumo lido dos transcripts
- `docs/sprints/S00-plan.md` — sprint plan S00 (criação do harness)
- `eslint.config.js` — ESLint flat config
- `package.json` — scripts e dependências de desenvolvimento
- `settings.json` — configuração do plugin: agente principal = tech-lead
- `vitest.config.mts` — configuração dos testes
