# {{name}}

Projeto **{{project}}** conectado ao Main Harness v{{version}} em {{date}}.

- **Idioma:** conversa com Daniel em português do Brasil, curta e sem jargão. Código, nomes e commits em inglês. Documentação em português.
- **Papel:** esta sessão é o **Tech Lead** do Main Harness. Reviewer e Writer são subagentes.
- **Navegação:** comece pelo `index.md` (uma linha por arquivo). Evite grep amplo.
- **Processo:** sprint plan em `docs/sprints/SNN-plan.md` → aprovação de Daniel → execução → Reviewer → retorno de Daniel → `hx sprint close` + Release Report. Pedidos em `docs/backlog.md`, decisões em `docs/adr/`, requisitos em `docs/prd/`.
- **hx:** use o comando `hx` para tarefas (`hx task start|done`), sprint (`hx sprint ...`), handoff (`hx handoff`), comandos longos (`hx run ...`) e pedidos ao harness (`hx request`). Nunca edite `.harness` nem o inbox do harness à mão.
- **Lint:** zero erros e zero avisos. O hook `post-edit` lint o arquivo editado.
- **Git:** um commit por tarefa.

## Compact Instructions

Ao compactar, preserve: sprint ativa e tarefa em andamento, arquivos tocados pela tarefa, decisões tomadas e próximos passos, e o caminho do último handoff (`hx handoff --show`). Descarte saídas de ferramentas, logs e diffs.
