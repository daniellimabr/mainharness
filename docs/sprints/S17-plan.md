# S17 — Backlog inteiro: ajustes com tarefa, clones identificados, plano validado

- **Projeto:** main-harness
- **Versão do harness:** 0.15.0
- **Status:** aguardando aprovação

## Objetivo

Daniel recebe o backlog aberto resolvido de uma vez (pedidos dos projetos financeiro, 6thgear, claude-tray e Dashboard IA incluídos): cada clone e o Reviewer aparecem nos dados com o nome e a tarefa em que participam; ajustes de Daniel viram tarefa com TNN (tempo, custo e commits ligados); o `hx sprint approve` recusa plano fora do formato; a estimativa nasce em minutos de agente; e os pedidos repetidos ou sem sentido saem do backlog.

## Escopo

1. **Clones e Reviewer identificados (B144, B088).** `hx task start|done|phase` e `hx review` gravam o agente da coluna Agente do plano (clone → `executor`, Reviewer → sempre `main-harness:reviewer`), com `--agent` para sobrepor; o `agent.start` do clone traz a tarefa. Os clones abrem toda mensagem e relatório com `[TNN]` (agente `executor`, skill `handoff`, `reviewer`).
2. **Ajuste vira tarefa (B140, B142, B146).** `hx sprint feedback` cria a tarefa de ajuste (próximo TNN, escrita no plano sem invalidar a aprovação, com a marca "ajuste"); `hx task`/`hx review` aceitam essa tarefa e "Ajuste N"; custo, tempo e commits ficam ligados a ela.
3. **Plano validado e Sala de controle (B143, B147, B149, B139, B081).** `hx sprint approve` recusa tabela fora do padrão (`Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado`, linha **Ondas:**, Planejado preenchido) dizendo o que falta; a mensagem de "plano mudou" cita `--force`; o evento `sprint.open` leva as tarefas do plano (id, título, agente, depende, minutos) para o Dashboard listar tudo desde a abertura; Início/Fim do Release Report mostram a data (`+Nd`) quando muda o dia.
4. **Estimativa em tempo de agente (B141, B093).** `sprint-plan` e template estimam em minutos de agente, com fator padrão de uma primeira sprint (0,25 soma, 0,33 relógio, tirados das S15 e S16) quando não há histórico; `hx metrics` mostra a razão planejado/real por tipo de agente. Espera por Daniel dentro da tarefa não conta na duração (B079); a revisão da tarefa final não conta o tempo das outras (B129).
5. **Regras locais do projeto (B148, B145).** `pre-bash` (Bash e PowerShell) nega comandos que o projeto proíbe em `.harness/local-rules.json` (lista de comando, mensagem de orientação; não bloqueia o wrapper nem texto que só cita o comando). `hx attach` lê o harness legado, grava as regras específicas nesse arquivo e em `claude-local.md` (ligado ao `CLAUDE.md`), lista para Daniel as que conflitam, reorganiza os documentos de contexto no padrão do harness, termina com relatório (mantido, novo, descartado), é idempotente e arquiva o original sem apagar.
6. **`hx shot` (B096; cobre B078 e B123).** Print com Chrome headless (tema claro/escuro, largura configurável) e o Reviewer passa a usá-lo nas tarefas de tela.
7. **Atritos pequenos.** `hx release` ignora o `SNN-release.md` da sprint (B090); `hx setup`/`hx doctor` só falam do que mudou e `doctor` não avisa mais pasta com espaço (B091); `hx eval` repete o caso que falha e vale 2 de 3 (B077); aviso toast no Windows quando o agente pede permissão ou para esperando Daniel, e `async` nos hooks só de observação (B109).
8. **Release v0.16.0** (Daniel digita o `hx release` no terminal dele).

### Backlog cancelado nesta sprint

- **B078, B123:** duplicados de B096 (os três pedem a conferência visual; fica o `hx shot`).
- **B093:** duplicado de B141 (fator padrão da primeira sprint).
- **B029 (CI):** o repo não tem remoto no GitHub; volta com o roadmap 4.
- **B080, B092:** o classificador do modo auto do Claude Code nega o comando; a causa é externa e o harness já orienta Daniel a digitar o comando (B104, B128). Sem como corrigir aqui.
- Os 2 pedidos do claude-tray são um só (o 2º substitui o 1º): B141.

## Fora de escopo

- Qualquer mudança no Dashboard IA (só o contrato de eventos muda aqui).
- Mudar a política de modelos (ADR 0013/0016) ou tornar o perfil leve padrão (ADR 0017).
- Reabrir os itens cancelados acima.

## Critérios de aceite

1. `hx task start T05 --agent` sem a flag grava `agent: executor` quando a coluna Agente é "clone (…)", `tech-lead` quando é "tech-lead"; `hx review` sempre grava `main-harness:reviewer`; `agent.start` do clone traz o TNN (testes).
2. `hx sprint feedback` cria a tarefa de ajuste no plano sem invalidar a aprovação; `hx task start|done`, `hx task phase` e `hx review pass|fail` aceitam o TNN de ajuste e "Ajuste N"; `hx metrics` mostra custo, tempo e commits do ajuste na linha dele (testes).
3. `hx sprint approve` recusa plano sem a tabela padrão, sem Depende de/Planejado ou sem **Ondas:**, com mensagem que lista o que falta; a mensagem de plano alterado cita `--force`; `sprint.open` lista as tarefas; Início/Fim mostram `+Nd` ao cruzar o dia (testes).
4. `sprint-plan` e template: estimativa em minutos de agente e fator padrão sem histórico; `hx metrics` traz razão por agente; espera por Daniel dentro da tarefa e revisão da final não entram na duração (testes e evals).
5. `pre-bash` nega `ssh`/`scp`/`sftp`/`ssh.exe` com a mensagem do projeto, no Bash e no PowerShell, e deixa passar `scripts/ssh_vm.py`, `ssh-vm.ps1` e texto que só cita `ssh` (mensagem de commit, grep, doc); `attach` repetido não duplica nem apaga o original e entrega o relatório; regra legada em conflito vem listada (testes com fixtures de repo legado).
6. `hx shot <url>` grava o print e diz o caminho, nos dois temas e na largura pedida, e erra claro se não achar o Chrome (teste com o navegador falso e uma execução real).
7. `hx release` não recusa por `SNN-release.md`; `hx setup`/`doctor` repetidos ficam calados no que já estava ok e sem aviso de pasta com espaço; `hx eval` repete caso que falha e vale 2 de 3 sem triplicar os que passam; toast dispara em `Notification`/`PermissionRequest` (teste com o disparo falso).
8. Skills e agentes alterados (`sprint-plan`, `handoff`, `executor`, `reviewer`) passam nos evals (`hx eval --changed`).
9. Release v0.16.0 publicada por Daniel; CHANGELOG, roadmap e backlog (itens `[concluído: S17]`) atualizados.
10. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):** T01 a T04 (agente, ajuste, validação do plano, metrics) com planos de exemplo em `cli/test/`; T06 (regras locais: bloqueia, libera wrapper, libera texto que só cita o comando, Bash e PowerShell); T07 (attach de repo legado com `CLAUDE.md` e regra de SSH; segunda execução igual; conflito listado); T08 (`hx shot` com Chrome falso); T10, T11, T12.
- **Evals de skill:** `sprint-plan` (corpo e template mudaram: `evals/evals.json`), `handoff` (corpo mudou). Agentes `executor` e `reviewer` não têm eval; o Reviewer confere o texto.
- **Integração:** `hx shot` real contra uma página local; `hx sprint approve` com o plano desta própria sprint depois das mudanças (o `hx` novo aceita o formato).
- **Limpeza:** fixtures em diretório temporário; nada gravado em `~/.harness` real nos testes.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Ajuste vira tarefa: `feedback` cria o TNN no plano; `task` e `review` aceitam TNN de ajuste e "Ajuste N" (B140, B142, B146) | clone (sonnet) | `cli/src/commands/sprint.ts`, `cli/src/commands/task.ts`, `cli/src/commands/review.ts`, `cli/src/sprint/index.ts`, `cli/test/ajuste-tarefa.test.ts` | — | 60 min | 15 min |
| T02 | Agente do clone e do Reviewer nos eventos de tarefa; `agent.start` com o TNN (B144, B088) | clone (sonnet) | `cli/src/core/context.ts`, `cli/src/hooks/index.ts`, `cli/test/agente-eventos.test.ts` | T01 | 45 min | 11 min |
| T03 | `approve` valida o plano e cita `--force`; `sprint.open` com as tarefas; data `+Nd` na tabela (B143, B147, B149, B139, B081) | clone (sonnet) | `cli/src/commands/sprint.ts`, `cli/src/sprint/index.ts`, `cli/src/events/schema.ts`, `docs/contracts/events.md`, `cli/test/plano-validado.test.ts` | T01 | 60 min | 15 min |
| T04 | `hx metrics`: razão por agente, espera por Daniel fora da tarefa, revisão da final sem sobreposição (B079, B129, B141 parte) | clone (sonnet) | `cli/src/commands/metrics.ts`, `cli/src/usage/index.ts`, `cli/test/metrics-agente.test.ts` | T03 | 60 min | 15 min |
| T05 | `sprint-plan` e template: minutos de agente e fator padrão sem histórico (B141, B093) | clone (sonnet) | `skills/sprint-plan/SKILL.md`, `skills/sprint-plan/evals/evals.json`, `templates/sprint-plan.md` | — | 45 min | 11 min |
| T06 | `pre-bash` com regras locais do projeto (B148) | clone (sonnet) | `cli/src/hooks/pre-bash.ts`, `cli/src/core/local-rules.ts`, `cli/test/local-rules.test.ts` | — | 50 min | 13 min |
| T07 | `attach` preserva regras do harness legado e reorganiza os documentos (B145) | clone (sonnet) | `cli/src/attach/classify.ts`, `cli/src/attach/reorg.ts`, `cli/src/commands/attach.ts`, `cli/test/attach-legado.test.ts` | T06 | 120 min | 30 min |
| T08 | `hx shot`: print com Chrome headless, claro/escuro (B096, B078, B123) | clone (sonnet) | `cli/src/commands/shot.ts`, `cli/test/shot.test.ts` | — | 60 min | 15 min |
| T09 | Texto dos agentes: `[TNN]` nas mensagens do clone e do Reviewer; Reviewer usa `hx shot` em tela (B144, B096) | clone (haiku) | `agents/executor.md`, `agents/reviewer.md`, `skills/handoff/SKILL.md` | T02, T08 | 20 min | 5 min |
| T10 | `release` ignora `SNN-release.md`; `setup` e `doctor` calados no que já está ok (B090, B091) | clone (sonnet) | `cli/src/commands/release.ts`, `cli/src/commands/setup.ts`, `cli/src/commands/doctor.ts`, `cli/test/release-setup-doctor.test.ts` | — | 40 min | 10 min |
| T11 | `hx eval`: caso que falha roda de novo e vale 2 de 3 (B077) | clone (sonnet) | `cli/src/eval/run.ts`, `cli/src/commands/eval.ts`, `cli/test/eval-maioria.test.ts` | — | 45 min | 11 min |
| T12 | Toast no Windows em permissão/espera e `async` nos hooks de observação (B109) | clone (sonnet) | `cli/src/hooks/attention.ts`, `cli/src/core/toast.ts`, `hooks/hooks.json`, `cli/test/toast.test.ts` | — | 50 min | 13 min |
| T13 | Revisão final, evals (`hx eval --changed`), CHANGELOG, roadmap, backlog e release v0.16.0 (Daniel roda o `hx release`) | tech-lead + reviewer | `CHANGELOG.md`, `docs/roadmap.md`, `docs/backlog.md`, `cli/src/index.ts`, `cli/dist/hx.js` | T04, T05, T07, T09, T10, T11, T12 | 90 min | 23 min |

**Ondas:** onda 1 = T01, T05, T06, T08, T10, T11, T12; onda 2 = T02, T03, T07; onda 3 = T04, T09; onda 4 = T13

Paralelismo: dentro de cada onda os arquivos não se cruzam. `cli/src/index.ts` (registro do `hx shot`) e o build de `cli/dist/hx.js` são do Tech Lead: registra e builda ao fim de cada tarefa, antes do commit. T02 e T03 só rodam depois da T01 por dividirem a base (`task.ts`, `sprint/index.ts`); T04 espera a T03 (`sprint/index.ts`). Um clone por tarefa, com o TNN no início de toda mensagem dele.

**Histórico (hx metrics):** S14 fica fora (sem fase `revisão` registrada na época; media até o done, com a revisão dentro).

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S15 | 3 h 30 min | 1 h 8 min | 4 h 23 min | 1 h 2 min |
| S16 | 3 h 15 min | 1 h 4 min | 6 h 9 min | 1 h 37 min |

Fator, só das sprints com fase `revisão`: S15 relógio 32%, soma 24%; S16 relógio 33%, soma 26%; média = relógio 33%, soma 25%. A Bruta abaixo é o que a tarefa pareceria a um dev; Planejado = bruta × 0,25. Referências: T01/T03 como S16/T04 (mudança em `sprint.ts` com testes); T07 como a S10 (attach com reorganização, a maior); T05 como S15/T03 (skill + eval).

**Total estimado:** soma bruta 12 h 25 min; soma calibrada 3 h 7 min. Relógio de agente: caminho mais longo T01 → T03 → T04 → T13 = 4 h 30 min bruto × 0,33 ≈ **1 h 30 min**. À parte: espera por Daniel (aprovação, teste da entrega, ajustes).

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-11-07 18:28:40 (horário de Brasília) — UTC 2026-11-07T21:28:40Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `76ef9a583b118f3d1686d94b0c9c5e9136f63ce92b758a0218c7b5570e6ff74a`
- **Versão do harness:** 0.15.0
