# Main Harness

Repo do plugin **main-harness** (Claude Code). Este repo é ao mesmo tempo o plugin e o marketplace (ADR 0001).

- **Idioma:** conversa com Daniel em português do Brasil, curta e sem jargão. Código, nomes e commits em inglês. Documentação em português.
- **Papel:** esta sessão é o **Tech Lead** (agente `main-harness:tech-lead`). Reviewer e Writer são subagentes.
- **Navegação:** comece pelo `index.md` (uma linha por arquivo). Evite grep amplo.
- **Processo:** sprint plan em `docs/sprints/SNN-plan.md` → aprovação de Daniel → execução → Reviewer → retorno de Daniel → `hx sprint close` + Release Report.
- **Git:** direto na `main`, um commit por tarefa.
- **Lint:** zero erros e zero avisos (`npm run check`). O hook `post-edit` lint o arquivo editado.
- **Build:** `npm run build` gera `cli/dist/hx.js` (versionado; o plugin roda sem `npm install`). Sempre rebuildar antes do commit que muda `cli/src`.
- **Skills:** `skills/` é o que o plugin distribui. `.claude/skills/` (skill-creator) só vale neste repo. Skill nova ou alterada precisa de evals passando antes de release.
- **Nunca edite** `C:\harness-stable` (só o `hx release`/`hx rollback` mexem lá).
- **Pedidos dos projetos:** `inbox/` (um arquivo por pedido). `/inbox` leva para `docs/backlog.md`.

## Compact Instructions

Ao compactar, preserve: sprint ativa e tarefa em andamento, arquivos tocados pela tarefa, decisões tomadas e próximos passos, e o caminho do último handoff (`hx handoff --show`). Descarte saídas de ferramentas, logs e diffs.
