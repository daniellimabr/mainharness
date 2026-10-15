# ADR 0008 — `/attach` como skill de usuário e plugin ativado por projeto

- **Status:** aceito
- **Data:** 2026-10-15

## Contexto

O plugin deve valer só nos projetos conectados: o `settings.json` do plugin troca a sessão principal pelo Tech Lead (ADR 0002), e isso não pode afetar os outros projetos de Daniel. Mas o `/attach` precisa existir **antes** de o plugin estar ativo no repo.

## O que a documentação e a máquina mostram

- Plugins são instalados por escopo (`user`, `project`, `local`); `installed_plugins.json` guarda um registro por projeto (`scope: "project"`, `projectPath`). `claude plugin install <id> --scope project` grava `enabledPlugins` no `.claude/settings.json` do projeto.
- Plugin de marketplace local com `source` relativo carrega direto da pasta, sem cópia (ADR 0001).
- Skill de usuário em `~/.claude/skills/<nome>/SKILL.md` vale em todos os projetos. Com `disable-model-invocation: true`, a descrição não entra no contexto: só roda quando Daniel digita o comando.
- Skills de plugin ficam com prefixo (`/main-harness:...`); uma skill de usuário `attach` responde a `/attach`.

## Decisão

- O plugin **não** é ativado no escopo de usuário. Cada projeto conectado ativa no escopo de projeto.
- `hx setup` (uma vez por máquina) cria `config.json`, registra o marketplace `harness-stable` e instala a skill de usuário `attach` (de `skills-user/attach/`), com `disable-model-invocation: true`.
- `/attach` (a skill de usuário) roda `node "C:/harness-stable/cli/dist/hx.js" attach` no repo aberto. O `hx attach` roda `claude plugin install <id> --scope project` para `main-harness@harness-stable`, `ponytail@ponytail` e `security-guidance@claude-plugins-official`, e configura o resto (seção 10 do processo).
- Depois do `/attach`, Daniel abre um chat novo para carregar o harness.
- Não existe comando `/attach` dentro do plugin (evita dois comandos com o mesmo nome).

## Consequências

- Nenhum outro projeto de Daniel é afetado.
- `skills-user/` é uma pasta do plugin que não é carregada pelo Claude Code (só copiada pelo `hx setup`).
