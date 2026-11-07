# Main Harness

Repo do plugin **main-harness** (Claude Code). Este repo é ao mesmo tempo o plugin e o marketplace (ADR 0001).

- **Idioma:** conversa com Daniel em português do Brasil, curta e sem jargão. Código, nomes e commits em inglês. Documentação em português.
- **Papel:** esta sessão é o **Tech Lead** (agente `main-harness:tech-lead`). O Reviewer é subagente: Sonnet na rotina, Opus em área sensível e na revisão final (ADR 0014). O Tech Lead escreve os documentos e se copia para ganhar tempo (ADR 0009).
- **Regra de ouro:** tudo que importa vai para arquivo (plano, ADR, backlog, handoff, `docs/decisoes-daniel.md`); o chat é descartável.
- **Navegação:** comece pelo `index.md` (uma linha por arquivo). Evite grep amplo.
- **Processo:** sprint plan em `docs/sprints/SNN-plan.md` → aprovação de Daniel → execução → Reviewer → retorno de Daniel → `hx sprint close` + Release Report.
- **Git:** direto na `main`, um commit por tarefa.
- **Lint:** zero erros e zero avisos (`npm run check`). O hook `post-edit` lint o arquivo editado.
- **Build:** `npm run build` gera `cli/dist/hx.js` (versionado; o plugin roda sem `npm install`). Sempre rebuildar antes do commit que muda `cli/src`.
- **Skills:** `skills/` é o que o plugin distribui. `.claude/skills/` (skill-creator) só vale neste repo. Skill nova ou alterada precisa de evals passando antes de release.
- **Nunca edite** `C:\harness-stable` (só o `hx release`/`hx rollback` mexem lá).
- **Pedidos dos projetos:** `inbox/` (um arquivo por pedido). `/inbox` leva para `docs/backlog.md`.

## Como rodar evals

- `hx eval --changed`: roda os evals das skills que mudaram desde a última tag. `hx eval <skill>`: uma skill.
- Sonnet, até 3 sessões em paralelo; caso que falha roda de novo e vale 2 de 3, cada uma em sandbox temporário. As sessões entram no `hx usage`.
- Escopo (ADR 0009): descrição mudou → só `evals/trigger.json` (8 consultas: 4 acionam, 4 não); corpo mudou → só `evals/evals.json`; mudança só em `evals/` não roda nada; skill nova roda tudo.
- Prompt do caso: traz as **decisões do produto** (o quê), para a skill escrever em vez de perguntar, mas **nunca a ação que o teste confere** (ex.: "edite o plano agora"). Pedido vago que deve gerar perguntas é um caso separado.
- Fixtures: arquivos que o caso pressupõe ficam em `evals/files*/` (ex.: `files-new/`) e entram em `files` do caso; o sandbox os copia no mesmo caminho relativo.
- Resultado em `evals/trigger-results.json`, `evals/cases-results.json` (veredito do juiz por caso) e `evals/results.json` (carimbado com o hash da skill). O `hx release` recusa skill alterada sem resultado passando.

## Compact Instructions

Ao compactar, preserve: sprint ativa e tarefa em andamento, arquivos tocados pela tarefa, decisões tomadas e próximos passos, e o caminho do último handoff (`hx handoff --show`). Descarte saídas de ferramentas, logs e diffs.
