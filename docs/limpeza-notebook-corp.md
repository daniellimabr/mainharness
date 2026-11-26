# Roteiro de limpeza do notebook corp

Levantamento só de leitura de 2026-11-26 (S19/T06). **Nada foi apagado.** Daniel executa este roteiro à mão, **só depois da S20 aprovada** (harness funcionando no PC pessoal).

Apagar não tem volta. Siga a ordem: decidir, salvar, conferir, apagar. Leia este roteiro pelo GitHub ou pelo pen drive: ele apaga a própria pasta onde está.

## 1. Decidir antes

| Item | O que há | Pergunta |
|---|---|---|
| `C:\SGC` | repo com **1 commit não enviado** e arquivos só locais (lista no anexo) | É pessoal? Não estava na lista da mudança |
| Pastas **sem Git** e ferramentas soltas (lista em `C:\migracao-pc\anexo-limpeza.md`, fora do Git por este repo ser público) | só neste notebook | Pessoal ou trabalho? Se pessoal e quiser guardar, copiar antes |
| Git, Node, Python (e pacotes), .NET, VS Code, Java no VS Code | programas | Usa no trabalho? O VS Code sai; os outros, só se não forem do trabalho |

Pastas de trabalho não entram neste roteiro.

## 2. O que se perde por não estar no GitHub

| O que | Situação | Salvar antes |
|---|---|---|
| `C:\6thGear` | sem GitHub, **93 commits só aqui** | não vai (decisão de Daniel): perde tudo |
| `C:\Cs-Manager` | sem GitHub, só local | não vai: perde tudo |
| `C:\Dashboard IA` | 5 arquivos sem commit (`docs/decisoes-daniel.md`, `index.md`, `docs/levar-para-main-harness.md`, `docs/prd/0001-harness-dash-extensao.md`, `docs/sprints/S16-plan.md`) | não vai: perde esses 5 |
| `C:\SGC` | itens da seção 1 | `git push` e copiar os soltos |
| Financeiro | `extratos xp\`, `scripts\vm-config.local.ps1`, `.claude\settings.local.json` | pacote `C:\migracao-pc` (T08) |
| Financeiro | `C:\Financeiro\credentials`: guarda uma chave de acesso. **Não vai no pacote** | copiar à mão, como as chaves abaixo |
| Financeiro | `.scratch\` (rascunhos fora do Git). Não vai no pacote | perde-se; copie à mão se quiser |
| RE Multimidia | `backup\` (107 MB) | pacote `C:\migracao-pc` |
| `.harness` e memória/ajustes do Claude | histórico, eventos, memória | pacote `C:\migracao-pc` |
| Chaves de acesso em `.ssh` e `.oci` | **sem elas você perde o acesso às máquinas da Oracle**. Não vão no pacote | copiar à mão em pen drive, ou criar novas no PC pessoal e cadastrar na Oracle antes de apagar |
| Chaves de API do `.harness\config.json` | não vão no pacote | gerar novas no PC pessoal |
| `.remember\` de cada projeto e histórico de conversas do Claude/VS Code | só local | perde (o que importa está nos arquivos dos projetos) |
| `C:\cs-manager-gustavo` | repo de terceiro, em dia | nada |

## 3. Salvar e conferir

1. Em cada repo que fica (`C:\Main Harness`, `C:\Financeiro\financeiro`, `C:\Financeiro\financeiro-showcase`, `C:\claude-tray`, `C:\RE Multimidia`, e `C:\SGC` se for o caso), os três precisam voltar **vazios**: `git -C "<pasta>" status --short`, `git -C "<pasta>" log --branches --not --remotes --oneline` e `git -C "<pasta>" stash list`.
2. Copie `C:\migracao-pc` (atualizado) e as chaves para o pen drive.
3. No PC pessoal, **abra** os arquivos copiados. Só então apague.

## 4. Apagar (nesta ordem)

Feche VS Code, Claude Desktop e a bandeja (Claude Usage Tray) antes.

**4.1 Programas e inicialização**

- Atalho `Claude Usage Tray.lnk`: `Win+R` → `shell:startup` → apagar.
- VS Code: desinstalar em Configurações → Aplicativos (leva junto as extensões, inclusive `main-harness.harness-dash`).
- Claude Desktop e GitHub CLI: desinstalar em Aplicativos, se instalados.
- Pacotes globais do Node: `npm uninstall -g @anthropic-ai/claude-code @google/clasp omniroute`.

**4.2 Pastas dos projetos** (PowerShell, uma linha por vez)

```powershell
Remove-Item -Recurse -Force "C:\Main Harness"
Remove-Item -Recurse -Force "C:\harness-stable"
Remove-Item -Recurse -Force "C:\Financeiro"
Remove-Item -Recurse -Force "C:\claude-tray"
Remove-Item -Recurse -Force "C:\RE Multimidia"
Remove-Item -Recurse -Force "C:\6thGear"
Remove-Item -Recurse -Force "C:\Cs-Manager"
Remove-Item -Recurse -Force "C:\cs-manager-gustavo"
Remove-Item -Recurse -Force "C:\Dashboard IA"
```

Mais as pastas que você marcou como pessoais na seção 1 (`C:\SGC` só se for uma delas).

**4.3 Pastas do usuário** (em `%USERPROFILE%`)

```powershell
$u = $env:USERPROFILE
foreach ($n in '.harness','.main-harness','.claude','.vscode','.vscode-shared','.agents','.aislop','.copilot','.dashboard-ia','.financeiro','.gateguard','.omniroute','.remember','.oci','.config\ponytail','.config\configstore','tools') { Remove-Item -Recurse -Force (Join-Path $u $n) -ErrorAction SilentlyContinue }
Remove-Item -Force "$u\.claude.json*", "$u\.clasprc.json", "$u\baseline-*.json", "$u\resultado-*.json" -ErrorAction SilentlyContinue
```

`.ssh`: abra a pasta e apague à mão só as chaves dos projetos (pode haver chave do trabalho ali).

Há outras pastas e arquivos pessoais fora dos projetos: veja o anexo e decida um a um.

**4.4 Dados de programas**

```powershell
foreach ($p in "$env:APPDATA\Code","$env:APPDATA\Claude Code","$env:APPDATA\GitHub CLI","$env:LOCALAPPDATA\Claude","$env:LOCALAPPDATA\Claude-3p","$env:LOCALAPPDATA\Claude-Data","$env:LOCALAPPDATA\claude-cli-nodejs","$env:LOCALAPPDATA\GitHub CLI","$env:LOCALAPPDATA\npm-cache") { Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue }
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\claude-mcp-browser-bridge-*", "$env:LOCALAPPDATA\Temp\claude" -ErrorAction SilentlyContinue
```

**4.5 Variáveis, logins e chaves**

- "Editar as variáveis de ambiente para sua conta": apagar `HARNESS_BIN` e as variáveis com token de projeto pessoal (ver anexo); no `Path`, tirar `%USERPROFILE%\.harness\bin` (e VS Code / Node, se desinstalados). `HOME`: apagar só se foi você que criou.
- Gerenciador de Credenciais do Windows → Credenciais do Windows → remover `git:https://github.com` e o que mais citar Claude ou GitHub.
- Chrome: sair das contas pessoais (GitHub, claude.ai, Google) ou apagar o perfil "Daniel (Pessoal)".
- No GitHub: revogar os tokens dessas variáveis. Em claude.ai e GitHub: encerrar as sessões deste notebook.
- Oracle e provedores de API: apagar as chaves antigas depois que as novas funcionarem.

**4.6 Por último**, depois de usar o anexo e de abrir a cópia no pen drive: `Remove-Item -Recurse -Force "C:\migracao-pc"` e esvaziar a Lixeira.

## 5. Não conferido

- Tarefas agendadas do Windows: a busca não achou nenhuma dos projetos.
- Docker, extensões e histórico do Chrome, Google Drive e OneDrive: fora do levantamento. Se guardou algo pessoal ali, olhe à mão.
- Cópias feitas pela TI (backup, antivírus, histórico da rede) não somem com este roteiro.
