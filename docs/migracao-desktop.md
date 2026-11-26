# Migração para o Claude Desktop (PC pessoal)

Levantamento de 2026-11-26, base para o sprint plan. Pedido de Daniel: manter o fluxo, hooks etc. como no VS Code, mas no Claude Desktop, sem os limites do notebook corp; remover a ligação com o dashboard web e a extensão.

## Limites do notebook corp

| Limite | Efeito hoje | No PC pessoal |
|---|---|---|
| PowerShell em ConstrainedLanguage (medido) | provável causa do B155 (`hx eval` falha) e risco para o toast (B154) | PowerShell normal (FullLanguage); instalar PowerShell 7; rodar `hx eval` para confirmar |
| Sem `gh` | CI visto à mão ou pelo Chrome (inbox 2026-11-22) | instalar `gh` e autenticar |
| Sem `docker` e `pwsh` (medido) | o que depende deles não roda local | instalar, se os projetos pedirem |
| CPU e memória (ADR 0018) | máximo de 4 clones | medir e rever o limite (B150) |
| Caminho com espaço (`C:\Main Harness`) | armadilhas de shell recorrentes | clonar em caminho sem espaço (ex.: `C:\dev\main-harness`) |

Não vêm do notebook e continuam no Desktop: bloqueio do `hx release`/`rollback` e do `hx sprint approve` pelo modo auto.

## Claude Desktop (aba Code)

Pela documentação (https://code.claude.com/docs/en/desktop): roda o Claude Code e compartilha `settings.json`, `CLAUDE.md`, skills e plugins; tem terminal, modo auto e tarefas agendadas. Não tem `claude -p` (modo sem tela) nem agent teams. Não lê o perfil do PowerShell: PATH vai nas variáveis do usuário.

Instalar junto: Node, Git, Python, CLI `claude` (o `hx eval` e o `hx worker` usam), `gh`.

**A testar no PC pessoal (a documentação lida não confirma):** hooks do plugin, agente principal `tech-lead` definido pelo plugin, marketplace de pasta (`C:\harness-stable`), `hx` no PATH das sessões, avisos de permissão.

## O que não vai pelo Git

- 14 commits locais ainda sem push (e conferir as tags).
- `~/.harness` (config com preços, eventos, estado, handoffs, projetos) e `~/.claude` (settings, `autoMode`, memória, CLAUDE.md global). Copiar à mão; conferir se há chaves de API.
- Os repos dos projetos conectados.
- `autoMode` cita `c:\Main Harness`: ajustar ao novo caminho.

## Respostas de Daniel (2026-11-26)

O notebook corp deixa de usar o harness. A pasta `.harness` vai junto. Os eventos locais ficam, desde que passem a ser registrados no Desktop (testar com os hooks). Projetos que vão: financeiro, Main Harness, RE Multimidia, claude-tray. Autorizado salvar e enviar o pendente. Cs-Manager não vai. Ao fim, o notebook corp é limpo de tudo ligado a projetos pessoais, VS Code e harness (depois de testar o PC pessoal). Plano: `docs/sprints/S19-plan.md` (aprovado). Repo do RE Multimidia criado por Daniel: https://github.com/daniellimabr/re-multimidia (a T01 confere se é privado e está vazio). Na limpeza, "Visual Studio" é o **VS Code**.

## Estado dos projetos (conferido em 2026-11-26)

| Projeto | Pasta | GitHub | Falta | Copiar à mão |
|---|---|---|---|---|
| Main Harness | `C:\Main Harness` | `mainharness` | 14 commits e arquivos soltos | — |
| financeiro | `C:\Financeiro\financeiro` | `financeiro` | 7 arquivos sem commit (S59/S60) | `C:\Financeiro\credentials`, `extratos xp/`, `scripts/vm-config.local.ps1`, `.claude/settings.local.json` |
| financeiro-showcase | `C:\Financeiro\financeiro-showcase` | `financeiro-showcase` | em dia | — |
| claude-tray | `C:\claude-tray` (o `projects.json` aponta `c:\Tools\claude-tray`, errado) | `claude-usage-tray` | em dia | recriar `.venv` |
| RE Multimidia | `C:\RE Multimidia` | **não tem** (1 commit só local) | criar repo privado; 11 arquivos sem commit | `backup/` (107 MB, fora do Git) |

Não citados: Cs-Manager (sem GitHub), `cs-manager-gustavo`, 6thGear, Dashboard IA.

## Remoção do dashboard e da extensão

- Sai: `extension/`, `cli/src/state/`, `hx state`, `docs/contracts/state.md`, testes da extensão e do estado, PRD 0001 e ADR 0019 marcados como substituídos, B158, extensão `main-harness.harness-dash` instalada, `~/.harness/dashboard`.
- Conferir um a um: eventos e hooks que só alimentavam o dashboard (`prompt`, `attention`, `subagent-start`, `status`).
- Fica: eventos locais usados por `hx metrics`, `hx usage` e Release Report.
