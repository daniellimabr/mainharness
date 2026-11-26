# Recriar o Main Harness do zero (instruções para o Claude Desktop)

**Para quem é:** o Claude (aba **Code** do Claude Desktop) no computador pessoal do Daniel, sem nenhum contexto anterior.

**Sua missão:** construir, do zero, um harness igual em comportamento ao Main Harness: um plugin do Claude Code em que a IA desenvolve com um processo de sprint e o Daniel só dirige. Esta página é a especificação. **Não copie nem clone o código antigo**, a menos que o Daniel peça.

## 0. Regras para você, desde já

- Fale com o Daniel em **português do Brasil, curto e sem jargão**. Código, nomes e commits em inglês. Documentação em português.
- O Daniel **define o que fazer, aprova o plano e dá retorno**. O resto é seu. Pare só para aprovação ou para o que você realmente não pode decidir; leve opções e a sua recomendação.
- **Uma fase por vez.** No fim de cada fase: mostre o que funciona, diga em passos numerados o que ele deve fazer, e espere o "ok".
- **Tudo que importa vai para arquivo** (plano, decisão, pendência, handoff). O chat é descartável.
- Se algo do Desktop não funcionar como descrito aqui, **pare e diga**, com a alternativa que recomenda. Não monte gambiarra em silêncio.
- O melhor código é o que não se escreve: faça o mínimo que resolve, sem abstração "para depois" e sem dependência por poucas linhas.
- Nunca grave chave, token ou senha em arquivo do repo. Pergunte antes de criar repo remoto ou enviar código (e recomende repo privado).
- Não existe limite de gasto, mas economize tokens e tempo.

## 1. O que é o harness

| Papel | Quem | Faz |
|---|---|---|
| Daniel | humano | pede, aprova o sprint plan, testa, dá retorno |
| Tech Lead | agente principal do chat | planeja, orquestra, executa, escreve documentos, commita |
| Executor | subagente (clone do Tech Lead) | uma tarefa, a partir de um handoff curto; não commita |
| Reviewer | subagente | revisa cada onda de tarefas e aprova ou reprova |

Fluxo:

1. Conversa → **sprint plan** em `docs/sprints/SNN-plan.md`.
2. Daniel aprova → o plano é carimbado com um hash. Mudou o plano, aprova de novo.
3. Execução em **chat novo**.
4. Por tarefa: iniciar → TDD → lint e tipos zerados → Reviewer → **um commit na `main`** → concluir.
5. Daniel testa; cada ajuste vira uma tarefa nova.
6. Daniel confirma → fecha a sprint e escreve o **Release Report**.

Três peças fazem isso funcionar:

- o **plugin** (agentes, comandos, skills, hooks);
- um CLI chamado **`hx`** (estado da sprint, handoff, métricas, hooks);
- os **arquivos do projeto** (`index.md`, `docs/`, `CLAUDE.md`).

## 2. Fase 0: provar o Desktop (antes de construir qualquer coisa)

Consulte a documentação oficial atual (https://code.claude.com/docs/en/desktop e as páginas de plugins, hooks e subagentes). Não confie na memória para formatos de arquivo.

Confira os programas: Git (com nome e e-mail configurados), Node LTS (20 ou mais), GitHub CLI (se for usar GitHub) e o CLI `claude`. Python e PowerShell 7 só se algo pedir.

Monte um **plugin de teste mínimo** numa pasta sem espaço no caminho (ex.: `C:\dev\harness-spike`) e prove, um a um:

| # | Prova |
|---|---|
| 1 | Um plugin de um marketplace em pasta local instala e carrega no Desktop |
| 2 | Hook `SessionStart` do plugin roda e injeta contexto no chat |
| 3 | Hook `PreToolUse` do plugin **bloqueia** um comando e um arquivo |
| 4 | Hook `PostToolUse` roda e a saída com erro (exit 2) volta para o agente |
| 5 | Hooks `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`, `SessionEnd` disparam |
| 6 | O plugin define o agente principal da sessão (`settings.json` com `"agent"`) |
| 7 | Comandos (`/nome-do-plugin:comando`), skills e subagentes do plugin aparecem |
| 8 | Um comando próprio (`hx`) é achado no terminal da sessão (o Desktop não lê o perfil do PowerShell; o PATH vai nas variáveis de ambiente do usuário) |
| 9 | Dá para ler uso de tokens nas transcrições da sessão, inclusive de subagentes |

Entregue uma tabela curta: funcionou, não funcionou, alternativa. **Espere o Daniel.** O que falhar muda o desenho das fases seguintes.

Saiba também: o Desktop pode não ter `claude -p` próprio (use o CLI `claude`) nem times de agentes; o modo auto nega alguns comandos, e esses o Daniel digita no terminal.

## 3. Fase 1: o núcleo (já dá para trabalhar)

Pare quando o Daniel conseguir rodar uma sprint pequena de verdade num projeto dele. A partir daqui, **construa o próprio harness usando o harness** (cada fase seguinte é uma sprint).

### 3.1 Repo

O repo é ao mesmo tempo o plugin e o marketplace.

```
.claude-plugin/plugin.json        name, version (única fonte de versão)
.claude-plugin/marketplace.json   marketplace local
settings.json                     {"agent": "main-harness:tech-lead"}
agents/        tech-lead.md, executor.md, reviewer.md
commands/      sprint-plan, sprint-run, continue, release-report, inbox
skills/        uma pasta por skill, com SKILL.md
skills-user/   attach/SKILL.md (comando /attach no nível do usuário)
templates/     CLAUDE.md, sprint-plan, release-report, adr, prd, backlog, roadmap, index, lint/
hooks/hooks.json
cli/src, cli/test, cli/build.mjs, cli/dist/hx.js
bin/hx, bin/hx.cmd
CLAUDE.md, index.md, docs/
```

TypeScript, Vitest, ESLint (`--max-warnings 0`), Prettier. `esbuild` gera **um arquivo** `cli/dist/hx.js`, versionado, para o plugin rodar sem `npm install`. `npm run check` = tipos + lint + formatação + testes. Mantenha a suíte rápida (a antiga levava mais de 5 min e atrasava tudo).

### 3.2 `hx` do núcleo

| Comando | O que faz |
|---|---|
| `hx sprint approve SNN` | valida o plano e grava quem, quando, versão e SHA-256 do conteúdo antes de `## Aprovação` (finais de linha em LF) |
| `hx sprint open SNN` | recusa plano sem aprovação ou alterado; cria a tabela `## Execução` (fora do hash) e imprime a lista |
| `hx sprint status` / `close SNN` | situação / fechamento |
| `hx sprint feedback 1` | cria a tarefa do ajuste pedido |
| `hx task start/done TNN` | marca início e fim, com duração |
| `hx task phase TNN fase` | testes, código, lint, fila, revisão, commit |
| `hx task drop/defer TNN --why "..."` | tira ou adia; o plano pede nova aprovação |
| `hx review pass/fail TNN --agent reviewer` | resultado da revisão |
| `hx handoff [--show, --consume]` | grava (texto no stdin) e mostra o handoff |
| `hx run <comando>` | roda testes, lint e build mostrando **só falhas e resumo** |
| `hx hook <nome>` | entrada de todos os hooks |

Estado e dados ficam **fora do repo**, em `~/.harness` (a variável `HARNESS_HOME` troca a pasta nos testes).

Plano: cabeçalho (projeto, versão, status), Objetivo, Escopo, Fora de escopo, Critérios de aceite (sempre com "zero erros e zero avisos"), Plano de testes, tabela `| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |`, linha `**Ondas:** onda 1 = T01, T02; onda 2 = T03`, histórico de estimativas e `## Aprovação`. Títulos de tarefa podem ter `;` e crase: teste isso (já quebrou).

Estimativas são em **minutos de agente**. Sem histórico, comece com fator 0,25 sobre a soma e 0,33 sobre o relógio, e recalibre.

A tabela de execução mostra: ✅ 🔄 ⬜, id, tarefa, agente, planejado, início, fim, duração (fila e revisão à parte). Horários na tela em Brasília; nos dados em UTC.

### 3.3 Hooks do núcleo

Todos chamam `node ${CLAUDE_PLUGIN_ROOT}/cli/dist/hx.js hook <nome>`.

**`session-start`** (SessionStart): injeta versão e projeto, resumo do `index.md`, lista de tarefas da sprint aberta, tarefa em andamento (após compactar) e o último handoff não consumido (até 4000 caracteres).

**`pre-bash`** (PreToolUse em Bash e PowerShell). Protege contra **acidente** da IA, não contra ataque. Separa comandos respeitando aspas e olha dentro de `powershell -Command`, `cmd /c`, `bash -c` e `hx run`.

- Nega: apagar em recursão a raiz do projeto ou algo fora dele (a pasta temporária do Claude pode); apagar `.git`; escrever na cópia estável; escrever `cli/dist/hx.js` à mão; `git push --force` ou `+refspec`; apagar a branch `main`; formatar disco; `cd` para caminho `/c/...`; comandos listados em `.harness/local-rules.json` do projeto (`[{"commands":["ssh"],"message":"..."}]`).
- Pergunta: push em outra branch ou `--all`/`--mirror`; `reset --hard`; `clean -f`; `checkout .`/`restore .`; `rebase`; comando codificado; commit com o `hx.js` desatualizado; apagamento cujo alvo não dá para verificar.
- Só avisa: armadilhas conhecidas (seção 8).
- Configuração quebrada nunca libera tudo.

**`pre-edit`** (Write/Edit): nega escrever na cópia estável e em `cli/dist/hx.js`.

**`post-edit`** (Write/Edit): acrescenta o arquivo ao `index.md` (formato ``- `caminho` descrição``, sob `## Arquivos`), remove linhas de arquivos apagados, formata e roda lint no arquivo, acusa BOM e acentos corrompidos no texto novo. Com problema: exit 2 e "Corrija antes de seguir."

Todo hook respeita `stop_hook_active` (sem loop) e registra o próprio erro em log, sem derrubar o chat.

### 3.4 Agentes

**Tech Lead** (agente principal). O texto dele precisa conter:

- as regras da seção 0 e o fluxo da seção 1;
- antes de recomendar, ler `docs/decisoes-daniel.md`; decisão nova entra lá no formato Decisão · Porquê · Descartado · Contraponto;
- durante a sprint, toda mensagem começa com `[TNN] Título curto:` (fora de tarefa, `[SNN]`);
- navegar pelo `index.md`; testes e builds sempre com `hx run`; delegar só com handoff curto, nunca "leia o repo";
- tarefas que não cruzam arquivos rodam em paralelo em executores; **dois agentes nunca editam o mesmo arquivo**; sem git worktrees; só o Tech Lead commita;
- commit `<tipo>(SNN/TNN): <resumo>` (feat, fix, docs, chore, refactor, test), direto na `main`;
- tarefa que cria ou muda tela pede antes um plano visual (skill de design, se instalada);
- a entrega de cada sprint termina com **o que o Daniel faz agora, em passos numerados**.

**Executor:** segue o handoff, só toca os arquivos permitidos, TDD, mínimo de código, não commita, lint e tipos zerados, usa `hx run`, relatório final curto.

**Reviewer:** uma revisão por onda. Roteiro: lint, tipos e testes (cria os que faltam; só edita arquivos de teste) → segurança do diff → excesso de código → critérios de aceite com evidência → testar a aplicação → conferir a tela, se houver (tema escuro, foco visível, estados vazio e de erro). Registra `hx review pass|fail`. Máximo de 2 reprovações por tarefa; na 3ª para e escala. Não corrige código de produção.

**Modelos:** um fixo por papel. Hoje: **Sonnet para tudo**; Haiku só para texto já decidido (até 3 arquivos, nada sensível, nunca revisão nem avaliação); Opus desligado por decisão do Daniel. Não troque de modelo pelo % de uso: perto do limite, grave o handoff e pare. Antes de gravar nomes de modelo, confira os atuais.

### 3.5 Skills e comandos do núcleo

Skills (curtas; a descrição diz quando usar e quando não): `sprint-plan`, `tdd-workflow`, `handoff` (máx. ~40 linhas: objetivo, estado, arquivos permitidos, decisões, critério de pronto, próximos passos).

Comandos:

- `sprint-plan`: lê backlog, roadmap e o último relatório; escreve o plano; mostra resumo de poucas linhas; aprovado, `hx sprint approve` e pede chat novo.
- `sprint-run SNN`: se o chat não está no modelo certo, para e avisa. `hx sprint open` → ondas → resumo para o Daniel testar → ajustes → `hx sprint close` + relatório. Mantém a lista de tarefas nativa em sincronia.
- `continue`: `hx handoff --show` e `hx sprint status`, segue os próximos passos, `hx handoff --consume`, e continua sem esperar resposta.

**Critério da Fase 1:** `npm run check` limpo; provas 1 a 8 valendo para o plugin real; uma sprint de 2 tarefas feita de ponta a ponta num projeto de teste.

## 4. Fase 2: não perder contexto, medir e conectar projetos

### 4.1 Contexto e continuidade

- Compactação automática em **140 mil** tokens (`autoCompactWindow`); handoff pedido a partir de **120 mil**.
- Hook `stop`: se o contexto passou de 120 mil e ainda não avisou desde a última compactação, **bloqueia** e pede `hx handoff`.
- Hooks `pre-compact` e `session-end` registram o momento. O handoff volta sozinho pelo `session-start`.
- O handoff vai por heredoc no Bash: o PowerShell 5.1 troca acentos por `?` ao mandar texto para outro programa.
- O Daniel quer **retomada automática depois do limite de uso**. A tentativa antiga foi retirada; verifique se o Desktop oferece isso de forma oficial (ex.: tarefas agendadas) e proponha. Use só caminhos oficiais da Anthropic.

### 4.2 Eventos e métricas

Um arquivo por dia (data UTC) em `~/.harness/events/AAAA-MM-DD.jsonl`, só acrescenta.

- Envelope: `v, id (ULID), ts (UTC), harness, project, session, sprint, task, agent, type, data` (o que não se aplica é `null`).
- **Só metadados:** nunca código, pedido, resposta ou segredo. Texto até 200 caracteres, sem quebra de linha; campo desconhecido é rejeitado.
- Tipos: `session.start/end`, `prompt` (só o horário), `turn.end`, `agent.start/end`, `sprint.approved/open/close/feedback/metrics`, `task.start/phase/done`, `review.result`, `usage` (modelo, tokens de entrada, saída, escrita e leitura de cache, US$, id da mensagem, tarefa), `alert.context`, `handoff`, `harness.request/release/rollback/migrate`.
- O uso é lido das transcrições, sem contar a mesma mensagem duas vezes. A tarefa de um subagente vem do `TNN` na descrição dele.
- `hx metrics [SNN]` e `hx usage`: tempo previsto e real, espera pelo Daniel, tokens e US$ por tarefa, agente e modelo, reprovações, ajustes, alertas, handoffs.

Preços por milhão de tokens ficam em `~/.harness/config.json` (entrada, saída, cache 5 min, cache 1 h, leitura): sonnet 2/10/2,5/4/0,2; opus 4/20/5/8/0,2; haiku 1/5/1,25/2/0,1. **Confira os valores atuais** antes de gravar. O mesmo arquivo guarda `contextLimit`, `handoffAt`, `harnessRepo`, `stableDir`, `inboxDir`, `timezone` (America/Sao_Paulo). Valor vazio significa "usar o padrão", nunca "pasta atual".

### 4.3 Release Report

Skill `release-report` e comando de mesmo nome: `docs/sprints/SNN-release.md` com a tabela de execução, resumo da entrega em linguagem simples, observações por tarefa, indicadores, revisão (critérios atendidos ou não, sem inflar), retorno do Daniel, retrospectiva comparando com sprints anteriores; melhorias do harness viram `hx request`; atualiza o CHANGELOG.

### 4.4 Conectar projetos (`hx attach`, `/attach`)

- Instala no projeto o plugin do harness e os companheiros: `ponytail@ponytail` (marketplace `DietrichGebert/ponytail`) e `security-guidance@claude-plugins-official`. O Daniel também usa `remember` e `claude-code-setup`; quer todos mantidos.
- Mescla `.claude/settings.json` sem apagar o que existe: permite `Bash(hx *)` e `PowerShell(hx *)`; `ENABLE_STOP_REVIEW=0` e `ENABLE_COMMIT_REVIEW=0`; `autoCompactWindow`.
- Cria **só o que falta**: `.claude/harness.json`, `CLAUDE.md`, `index.md`, `docs/{sprints,adr,prd}`, `docs/backlog.md`, `docs/roadmap.md`, `docs/decisoes-daniel.md`, `inbox/`. Lint padrão só se o projeto for JavaScript/TypeScript e não tiver ESLint.
- Se for reorganizar arquivos, mostra o plano e só faz depois do "sim". Preserva regras antigas do projeto.
- Opcionais por projeto: `claude-local.md` (regras do projeto) e `.harness/local-rules.json`.

O `CLAUDE.md` criado no projeto diz: idioma; o chat é o Tech Lead; começar pelo `index.md`; o processo de sprint; usar o `hx`; zero erros e avisos; um commit por tarefa; e uma seção "Compact Instructions" (preservar sprint e tarefa, arquivos tocados, decisões, próximos passos, caminho do último handoff; descartar logs e diffs).

**Critério da Fase 2:** um projeto real conectado, uma sprint com handoff após compactação, `hx metrics` com custo por tarefa e o relatório gerado.

## 5. Fase 3: versões estáveis e o resto

Pergunte ao Daniel o que ele quer antes de fazer cada item.

| Item | Descrição | Recomendação |
|---|---|---|
| Cópia estável e `hx release patch/minor/major`, `rollback` | os projetos usam uma cópia numa tag (ex.: `C:\harness-stable`), não o repo em obra; exige git limpo, identidade no git e avaliações passando; **só o Daniel digita** | fazer |
| `hx setup`, `hx doctor`, `hx migrate` | instalar em máquina nova sem caminho preso, diagnosticar, atualizar projetos | fazer |
| `hx request` e `/inbox` | projeto pede melhoria do harness; um arquivo por pedido em `inbox/`, levado para `docs/backlog.md` | fazer |
| Skills `adr`, `prd`, `security-review` | decisões, requisitos, revisão de segurança por tarefa | fazer |
| `hx eval <skill>` / `--changed` | testa as skills em sessões descartáveis (Sonnet, até 3 em paralelo; caso que falha repete e vale 2 de 3); descrição mudou, testa o disparo; corpo mudou, testa os casos; o caso nunca dita a ação que o teste confere | fazer depois das skills |
| Aviso do Windows | notificar quando o chat precisa do Daniel | fazer, se o Desktop não avisar sozinho |
| `hx shot` | print de tela (claro e escuro) para o Reviewer | só se houver projeto com tela |
| Skills de terceiros (`frontend-design`, `webapp-testing`, `archify`) | instalar as originais, não reescrever | sob demanda |
| `hx worker` (modelo de outro provedor, ex.: DeepSeek) | era pontual | **não fazer** sem o Daniel pedir |

## 6. Fora do escopo (não construa)

- Painel web, extensão do VS Code, arquivo de estado para painel, servidor ou porta: **não funcionaram**.
- Gemini ou outros modelos grátis executando tarefas: lentos e com falhas que lint e testes não pegam.
- Perfil "leve" do harness; troca de modelo pelo % de uso; agente "Writer"; git worktrees.
- Usar a assinatura do Claude por trás de um roteador de terceiros (risco nos termos de uso).
- Alterar `~/.claude/settings.json` com chats abertos como forma de trocar de modo (já derrubou um chat).

## 7. Preferências do Daniel (registre em `docs/decisoes-daniel.md`)

- Sonnet em tudo, Opus desligado.
- Um modelo por papel, decidido no plano.
- Reviewer enxuto; o Tech Lead escreve os documentos.
- Harness completo, com os plugins companheiros.
- Paralelismo: o limite de clones depende da máquina. Comece com poucos, meça o uso do computador e **combine o limite com o Daniel**.
- Um commit por tarefa, direto na `main`.
- Zero erros e zero avisos, sempre.

## 8. Armadilhas já pagas

- Caminho com espaço gera erros falsos e bloqueios: trabalhe em pasta sem espaço, mas teste o `hx` com espaço no caminho.
- No PowerShell 5.1: `Set-Content`/`Out-File -Encoding utf8` grava BOM; `2>&1` em programa nativo falsifica erro; `hx ... | Select-Object -First` corta o processo.
- JSON de configuração com BOM quebra a leitura: leia tolerando BOM.
- Instale o CLI `claude` antes do `setup`; o `setup` precisa das tags do git (sem `--depth 1`).
- O `marketplace.json` não deve depender de um caminho fixo de uma máquina.
- O diagnóstico não deve pedir para reabrir o programa para sempre: só quando fizer sentido.
- Não prometa o que não foi testado na máquina do Daniel. Diga "não testei".

## 9. Primeira resposta esperada

1. Diga em até 5 linhas o que entendeu.
2. Diga que vai fazer a Fase 0 e onde.
3. Faça a Fase 0 e entregue a tabela de provas, sem construir o harness ainda.
