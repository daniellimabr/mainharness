# Instalar o harness no PC pessoal (Claude Desktop)

Guia da S19/T05. Executado na S20. Base: `docs/migracao-desktop.md`.

**Ainda não testado:** nada deste guia rodou num PC novo. O roteiro da seção 6 é o teste.

## 1. Programas

Instale, nesta ordem, e confira cada um num PowerShell novo:

| Programa | Confere com |
|---|---|
| Git | `git --version` |
| Node (LTS) | `node --version` |
| Python | `python --version` |
| PowerShell 7 | `pwsh --version` |
| GitHub CLI | `gh --version`, depois `gh auth login` |
| CLI `claude` | `claude --version`, depois entrar na conta |
| Claude Desktop | abrir a aba **Code** e entrar |

O CLI `claude` vem **antes** do `hx setup`, que o chama para registrar o plugin. Não conte com o Desktop sozinho para isso.

Configure sua identidade no Git (sem ela o `hx release` falha no meio e não repete sozinho):

```powershell
git config --global user.name "Seu Nome"
git config --global user.email "seu-email"
```

## 2. Clonar

Em caminho **sem espaço**, com `git clone` normal (sem ZIP e sem `--depth 1`: o `hx setup` precisa das tags).

```powershell
git clone https://github.com/daniellimabr/mainharness.git C:\dev\main-harness
```

Os outros projetos: `financeiro`, `financeiro-showcase`, `claude-usage-tray` e `re-multimidia` (privado), cada um em `C:\dev\<nome>`.

## 3. Trazer o que está em `C:\migracao-pc`

Copie a pasta do pen drive. O conteúdo está em `C:\migracao-pc\LISTA.md`.

**Antes do `hx setup`:**

- `harness\` → `%USERPROFILE%\.harness`
- O `config.json` copiado vai **sem chaves de API**: crie novas e preencha em `worker`/`workers`, se for usar o worker. Salve em UTF-8 **sem BOM** (no VS Code ou Bloco de Notas, "UTF-8").
- `claude\CLAUDE.md` → `%USERPROFILE%\.claude\CLAUDE.md`
- `claude\settings.json`: **não sobrescreva** o novo. Copie só o que quiser (permissões, `autoMode`), trocando `c:\Main Harness` pelo caminho novo.
- `projetos\<nome>\` → por cima do clone de cada projeto.

**Memória do Claude:** o nome da pasta depende do caminho do projeto. Abra um chat uma vez em cada projeto, veja a pasta que surgiu em `%USERPROFILE%\.claude\projects` e copie para dentro dela a `memory` correspondente do pacote.

## 4. Instalar

```powershell
cd C:\dev\main-harness
npm ci
node cli/dist/hx.js setup
```

Depois:

1. Feche e abra o Claude Desktop (e o VS Code, se usar).
2. `hx doctor` e resolva o que ele apontar.
3. Plugins de terceiros usados hoje:

```powershell
claude plugin marketplace add DietrichGebert/ponytail
claude plugin install ponytail@ponytail
claude plugin install security-guidance@claude-plugins-official
```

4. Em cada projeto, **inclusive o do harness**, abra um chat, rode `/attach` e abra um chat novo. É o `/attach` que instala o plugin no projeto (o setup só registra a origem) e troca o caminho antigo no registro (inclusive o do claude-tray, que estava errado).
5. claude-tray: recrie o `.venv`.

O `hx setup` grava `harnessRepo` e `inboxDir` a partir da pasta onde ele roda. Se mover o clone, ou rodar o setup de um segundo clone, os caminhos passam a ser os dele.

## 5. Publicar a nova versão

O setup cria a cópia estável (`C:\harness-stable`) na **última tag**. A `v0.16.0` ainda tem o dashboard e não tem os ajustes de caminho, então os testes só valem depois desta seção. No PC pessoal, na S20:

0. Rode `git status`. O release recusa alteração não commitada, e há: o `/attach` regrava `.claude/harness.json`. Peça ao Tech Lead para commitar antes.
1. O Tech Lead entrega a linha do `hx release` e **você** a digita no terminal, dentro de `C:\dev\main-harness`. Se recusar por avaliação de skill, rode `hx eval --changed`, peça o commit do resultado e repita.
2. `git push --follow-tags`
3. `node cli/dist/hx.js setup` de novo.
4. Feche e abra o Claude Desktop.

## 6. Roteiro de testes no Claude Desktop

Faça num chat **novo**, na aba Code, na pasta do harness. Se o 6.1 falhar, pare: o resto depende dele.

### 6.1 Hooks

Se o teste 3 **não** bloquear, apague o arquivo criado (estável com arquivo solto trava o release). Depois do teste 4, confira `git status`: o hook também acrescenta o arquivo ao `index.md`.

| # | Faça | Esperado |
|---|---|---|
| 1 | Abra o chat e pergunte "qual versão do harness você vê?" | responde a versão e o projeto (hook de abertura) |
| 2 | Peça "rode `git push --force` com `--dry-run`" | bloqueado: "git push forçado" |
| 3 | Peça para criar um arquivo de teste em `C:\harness-stable` | bloqueado |
| 4 | Peça para criar `teste.ts` em `cli/src` com uma variável sem uso, e depois apagar | aparece o erro de lint na hora |
| 5 | Veja a pasta `%USERPROFILE%\.harness\events` | há registros de hoje (abertura, pedido, fim de resposta) |
| 6 | Peça uma tarefa a um subagente e feche o chat | há registros de início e fim do agente e fim de sessão |
| 7 | Faça um pedido que precise de permissão e troque de janela | aviso do Windows |

### 6.2 Plugin e comandos

| # | Faça | Esperado |
|---|---|---|
| 8 | Pergunte "qual é o seu papel?" | Tech Lead (agente principal do plugin) |
| 9 | Digite `/main-harness:` | aparecem sprint-plan, sprint-run, continue, release-report |
| 10 | Peça `hx doctor` e `hx usage` | rodam sem "comando não encontrado" e sem pedido de permissão |
| 11 | `hx eval handoff` | passa (no notebook corp falhava, B155) |
| 12 | `npm run check` | zero erros e avisos, testes passando |

Anote o que falhar (número e mensagem): vira tarefa da S20. O `hx release`, o `hx rollback` e o `hx sprint approve` continuam bloqueados no modo auto.

## 7. Depois

Com tudo passando, a S20 revê o limite de clones (B150). Só então siga `docs/limpeza-notebook-corp.md` no notebook corp.
