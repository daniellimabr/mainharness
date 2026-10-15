# S00 — Criação do Main Harness (v0.1.0)

- **Projeto:** main-harness
- **Versão do harness:** pré-0.1.0 (o harness ainda não existe; esta sprint o constrói)
- **Status:** aguardando aprovação
- **Execução:** neste mesmo chat (exceção da S00). A partir da S01, execução em chat novo.

## Objetivo

Entregar a v0.1.0 do Main Harness: plugin do Claude Code instalado a partir de `C:\harness-stable`, com o CLI `hx`, hooks, agentes, skills, contrato de eventos e processo de sprint funcionando, pronto para o `/attach` no `C:\Dashboard IA`.

## Escopo

1. Repo `C:\Main Harness` como plugin + marketplace (ADR 0001), com `CLAUDE.md`, `index.md`, `CHANGELOG.md`.
2. CLI `hx` em TypeScript, bundle único `cli/dist/hx.js`: `hook session-start|post-edit|pre-bash|stop|subagent-stop|pre-compact|session-end`, `task`, `sprint` (`open|close|approve`), `handoff`, `run`, `request`, `attach`, `migrate`, `release`, `rollback`, `metrics`, `doctor`, `usage`, `skills on|off`.
3. Agentes `tech-lead` (sessão principal, ADR 0002), `reviewer`, `writer`.
4. Comandos `/attach`, `/sprint-plan`, `/sprint-run`, `/release-report`, `/inbox`, `/continue`.
5. Skills próprias: `adr`, `prd`, `sprint-plan`, `release-report`, `handoff`, `security-review`. Copiadas: `tdd-workflow` (ECC, MIT, adaptada), `archify` (MIT), `optional/webapp-testing` e `optional/frontend-design` (anthropics/skills). `skill-creator` em `.claude/skills/` (só no repo do harness). Cada cópia com `SOURCE.md`.
6. Templates: `CLAUDE.md` curto, `index.md`, ADR, PRD, sprint plan, release report, pedido de inbox.
7. Contrato `docs/contracts/events.md`, `docs/roadmap.md` (seção 15), `docs/backlog.md`.
8. Lint do próprio repo: ESLint (flat), Prettier, TypeScript estrito; padrão instalado pelo `/attach` em repos sem lint.
9. `C:\harness-stable`, marketplace registrado, plugin instalado e ativo no próprio `C:\Main Harness`.
10. Release v0.1.0 via `hx release`, CHANGELOG e Release Report.

## Fora de escopo

Dashboard IA, publicação no GitHub, git worktrees, OpenTelemetry, limite de gasto, notificações do Windows (roadmap).

## Decisões da pesquisa (ADRs)

| ADR | Decisão |
|---|---|
| 0001 | Repo é plugin e marketplace (`source: "./"`). Marketplace local carrega no lugar, sem cache: release = checkout de tag em `C:\harness-stable` |
| 0002 | `settings.json` do plugin com `"agent": "main-harness:tech-lead"` torna o Tech Lead a sessão principal |
| 0003 | Hooks em forma exec: `node` + `args` com `${CLAUDE_PLUGIN_ROOT}`. Sem shell, sem problema de espaço. Erro = log + exit 0 |
| 0004 | `bin/hx` e `bin/hx.cmd` põem o `hx` no PATH dos agentes; permissão única `Bash(hx *)` no projeto |
| 0005 | `skillOverrides` não vale para skills de plugin → catálogo opcional é copiado para `.claude/skills/` do projeto web |
| 0006 | **Compactação gerenciada** (decisão de Daniel): `autoCompactWindow: 250000` no projeto; aos 230K o agente escreve o handoff; aos 250K o Claude Code compacta sozinho, o hook registra alerta + handoff e reinjeta o handoff. 100% autônomo. O ADR guarda o caminho de volta para "chat novo + Enter" |
| 0007 | Consumo dos transcripts com deduplicação por `message.id`, subagentes em `<sessão>/subagents/`, preços em `config.json` |

## Critérios de aceite

1. `hx doctor` passa no Windows do Daniel (Node, git, Python 3.8+, plugins ativos, skills, caminhos com espaço).
2. Plugin instalado a partir de `C:\harness-stable` e funcionando num chat novo.
3. Um chat novo gera `session.start` em `%USERPROFILE%\.harness\events\`.
4. Editar um arquivo com erro de lint faz o hook devolver o erro ao agente (exit 2 com a mensagem).
5. `hx task start/done` atualiza o checkbox do sprint plan e gera eventos com duração.
6. `hx usage` produz eventos `usage` a partir dos transcripts.
7. `hx request` cria um arquivo novo no inbox (nunca edita um existente).
8. `hx release` gera tag, CHANGELOG e move `C:\harness-stable`; `hx rollback` volta para a tag anterior.
9. A aprovação deste plano registrada como `sprint.approved`, com hash do arquivo aprovado e data/hora da aprovação.
10. Release Report da S00 com indicadores e retrospectiva.
11. Teste de esquema falha se algum evento tiver campo fora do esquema.
12. `docs/roadmap.md` conforme a seção 15.
13. Alerta de 250K testado com limite reduzido: `stop` acima de `handoffAt` → `alert.context` + pedido de handoff; `pre-compact` → evento `handoff`; `session-start` com `source: "compact"` → handoff reinjetado.
14. skill-creator em `.claude/skills/` e usado para testar `adr`, `prd`, `sprint-plan`, `release-report`, `handoff`, `security-review` e `tdd-workflow` (casos em `skills/<nome>/evals/`, resultado registrado).
15. `/attach` liga o catálogo opcional num projeto web e não liga num não web (teste com pastas temporárias criadas e apagadas pelo teste).
16. Tudo funciona com caminhos com espaço (teste E2E com `C:\Main Harness` e uma pasta temporária com espaço).
17. **Lint e tipos zerados: zero erros e zero avisos.**
18. `docs/contracts/events.md` escrito.

## Plano de testes (tdd-workflow: teste antes do código em cada tarefa do `hx`)

- **Unitários (Vitest):** ULID e esquema de eventos (inclui teste que falha com campo extra ou conteúdo proibido); parser de transcript (dedupe, subagentes, preço, modelo desconhecido); cálculo de contexto; parser da tabela de tarefas do sprint plan; `pre-bash` (lista de comandos bloqueados e liberados); detecção web/não web; slug de projeto; bump de versão e CHANGELOG.
- **Integração:** cada hook com stdin JSON real e `cwd` com espaço, conferindo saída, exit code e evento gravado; `post-edit` com arquivo `.ts` com erro de lint → exit 2; `stop` com limite reduzido → `alert.context` + block; `pre-compact` → evento `handoff`; `session-start` `source: "compact"` → handoff no contexto.
- **E2E:** `hx attach` em duas pastas temporárias com espaço (web e não web), criadas e apagadas pelo teste; `hx release`/`hx rollback` contra repos git temporários; `hx request` com inbox temporário.
- **Prática (T14):** chat novo `claude -p` em `C:\Main Harness` com o plugin instalado → `session.start` gravado; `claude plugin validate` passa.
- `HARNESS_HOME` redireciona `%USERPROFILE%\.harness` nos testes, para não sujar os dados reais.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Estimativa |
|---|---|---|---|---|
| T01 | Base do repo: package, tsconfig, eslint, prettier, vitest, build esbuild, manifests, CLAUDE.md, index.md, .gitignore | tech-lead | `package.json`, `cli/tsconfig.json`, `eslint.config.js`, `.prettierrc`, `vitest.config.ts`, `.claude-plugin/*`, `settings.json`, `CLAUDE.md`, `index.md`, `.gitignore` | 20 min |
| T02 | Núcleo do hx: caminhos, config, projetos, eventos (ULID, esquema, gravação), log de erros, roteador de comandos | tech-lead | `cli/src/index.ts`, `cli/src/core/*`, `cli/src/events/*`, `cli/test/events.test.ts` | 30 min |
| T03 | Consumo: adaptador de transcripts, preços, contexto, `hx usage` | clone A | `cli/src/usage/*`, `cli/test/usage.test.ts` | 30 min |
| T04 | Hooks: session-start, post-edit (lint + index.md), pre-bash, stop/subagent-stop (consumo, 250K), pre-compact, session-end | clone B | `cli/src/hooks/*`, `cli/src/index/*`, `cli/src/lint/*`, `cli/test/hooks.test.ts` | 45 min |
| T05 | Comandos de sprint: task, sprint (open/close/approve), handoff, run, request, metrics | clone C | `cli/src/commands/{task,sprint,handoff,run,request,metrics}.ts`, `cli/src/sprint/*`, `cli/test/sprint.test.ts` | 45 min |
| T06 | attach, migrate, skills on/off, doctor + templates | clone D | `cli/src/commands/{attach,migrate,skills,doctor}.ts`, `cli/src/migrations/*`, `templates/*`, `cli/test/attach.test.ts` | 45 min |
| T07 | release e rollback | tech-lead | `cli/src/commands/{release,rollback}.ts`, `cli/test/release.test.ts` | 30 min |
| T08 | Agentes, comandos, hooks.json, bin/ | tech-lead | `agents/*`, `commands/*`, `hooks/hooks.json`, `bin/*` | 25 min |
| T09 | Skills próprias + evals | writer | `skills/{adr,prd,sprint-plan,release-report,handoff,security-review}/**` | 40 min |
| T10 | Skills de terceiros: cópia, adaptação do tdd-workflow, SOURCE.md, skill-creator | tech-lead | `skills/{tdd-workflow,archify}/**`, `skills/optional/**`, `.claude/skills/skill-creator/**` | 30 min |
| T11 | Documentação: contrato de eventos, roadmap, backlog | writer | `docs/contracts/events.md`, `docs/roadmap.md`, `docs/backlog.md` | 20 min |
| T12 | Teste E2E com caminhos com espaço | tech-lead | `cli/test/e2e.test.ts` | 25 min |
| T13 | Revisão: lint e tipos zerados, testes, security-review, revisão Ponytail, critérios de aceite | reviewer | (só leitura + correções pedidas) | 30 min |
| T14 | Instalação: `C:\harness-stable`, marketplace, plugin ativo no Main Harness, validação prática num chat novo | tech-lead | `.claude/settings.json` | 20 min |
| T15 | Testes das skills com skill-creator (acionamento + casos) | reviewer | `skills/*/evals/*` | 40 min |
| T16 | Release v0.1.0, rollback testado, Release Report | tech-lead + writer | `CHANGELOG.md`, `docs/sprints/S00-release.md` | 20 min |

**Paralelismo:** T03, T04, T05 e T06 rodam em paralelo (clones) depois de T02; T09, T10 e T11 em paralelo com eles. Arquivos não se cruzam; o roteador (`cli/src/index.ts`) é editado só pelo Tech Lead depois que os clones entregam.

**Git:** um commit por tarefa na `main`.

**Total estimado:** ~8 h de trabalho de agentes.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora (UTC):** 2026-10-15T04:59:39Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `49ffeb0c472e1c571b3ce3490e9c92f139bb31567e226cca3eadca2365502cad`
- **Versão do harness:** pré-0.1.0
- O evento `sprint.approved` é gravado assim que o `hx` ficar pronto, com esta data/hora e este hash.
