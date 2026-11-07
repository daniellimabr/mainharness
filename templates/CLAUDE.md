# {{name}}

Projeto **{{project}}** conectado ao Main Harness v{{version}} em {{date}}.

- **Idioma:** conversa com Daniel em português do Brasil, curta e sem jargão. Código, nomes e commits em inglês. Documentação em português.
- **Papel:** esta sessão é o **Tech Lead** do Main Harness. Reviewer é subagente; documentos são do Tech Lead.
- **Navegação:** comece pelo `index.md` (uma linha por arquivo). Evite grep amplo.
- **Processo:** sprint plan em `docs/sprints/SNN-plan.md` → aprovação de Daniel → execução → Reviewer → retorno de Daniel → `hx sprint close` + Release Report. Pedidos em `docs/backlog.md`, decisões em `docs/adr/`, requisitos em `docs/prd/`.
- **hx:** use o comando `hx` para tarefas (`hx task start|done`), sprint (`hx sprint ...`), handoff (`hx handoff`), comandos longos (`hx run ...`) e pedidos ao harness (`hx request`). Nunca edite `.harness` nem o inbox do harness à mão.
- **Regras locais:** se existir `claude-local.md`, leia no início da sessão (regras específicas deste projeto, ex.: acesso a servidor, ferramentas proibidas). Comandos proibidos ficam em `.claude/local-rules.json` (`{"deny":[{"command":"ssh","message":"orientação"}]}`); o hook pre-bash nega e mostra a mensagem.
- **Lint:** zero erros e zero avisos. O hook `post-edit` lint o arquivo editado.
- **Git:** um commit por tarefa.
- **Bash em pasta com espaço:** a linha `claude-XXXX-cwd: No such file or directory` e o "Exit code 1" junto são do Claude Code; leia a saída real. Não comece com `cd` (o Bash já abre no projeto); se precisar, `cd "C:/Pasta Com Espaço"`. Sem necessidade do Bash, prefira o PowerShell; testes (vitest) nessa pasta rodam pelo PowerShell.

## Compact Instructions

Ao compactar, preserve: sprint ativa e tarefa em andamento, arquivos tocados pela tarefa, decisões tomadas e próximos passos, e o caminho do último handoff (`hx handoff --show`). Descarte saídas de ferramentas, logs e diffs.
