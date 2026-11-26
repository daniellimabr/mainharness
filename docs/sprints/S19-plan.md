# S19 — Preparar a mudança para o Claude Desktop no PC pessoal

- **Projeto:** main-harness
- **Versão do harness:** 0.16.0
- **Status:** aguardando aprovação

## Objetivo

Daniel sai do notebook corp com tudo salvo no GitHub, o harness sem dashboard nem extensão e sem caminhos presos a esta máquina, um guia para instalar no PC pessoal, um pacote com o que não vai pelo Git e um roteiro para limpar o notebook corp depois. Base: `docs/migracao-desktop.md`.

## Escopo

1. **Salvar e enviar** o que está pendente no Main Harness (com tags), financeiro e RE Multimidia, depois de conferir que não há senha no meio e que nenhum outro chat mexe no projeto. Conferir que os repos são privados.
2. **Remover dashboard e extensão:** `extension/`, `cli/src/state/`, `hx state`, `HARNESS_DASHBOARD`, testes, e os eventos ou hooks que só alimentavam o painel (conferidos um a um). Os eventos usados por `hx metrics`, `hx usage` e Release Report ficam.
3. **Harness sem caminhos fixos:** `hx setup` grava onde está o repo, o inbox e a pasta estável; funciona em caminho diferente do atual.
4. **Guia de instalação** no PC pessoal, com roteiro de testes no Claude Desktop (hooks primeiro).
5. **Roteiro de limpeza** do notebook corp (só levantamento e instruções; nada é apagado nesta sprint).
6. **Pacote de cópia** em `C:\migracao-pc`: histórico `.harness`, memória e ajustes do Claude, arquivos fora do Git (financeiro, RE Multimidia). Sem token de login e sem chaves de API.

## Fora de escopo

- Instalar e testar no PC pessoal, publicar a nova versão (`hx release`) e rever o limite de clones (B150): S20, no PC pessoal.
- **Limpar o notebook corp:** Daniel executa o roteiro só depois da S20 aprovada.
- Cs-Manager, `cs-manager-gustavo`, 6thGear e Dashboard IA (não vão).
- B155 (eval com PowerShell) e B159 (CI sem `gh`; com `gh` instalado perde urgência).

## Critérios de aceite

1. Main Harness, financeiro e RE Multimidia sem arquivo pendente e sem commit por enviar; tags do harness no GitHub.
2. Nenhuma referência a extensão, `state.json` ou `HARNESS_DASHBOARD` no código, hooks, testes e documentos vivos (ADR, PRD, CHANGELOG e sprints antigas ficam como histórico; ADR 0019 e PRD 0001 marcados como substituídos).
3. `hx metrics`, `hx usage` e o Release Report continuam funcionando.
4. `hx setup` rodado a partir de uma cópia em outro caminho grava os caminhos dessa cópia.
5. Clone novo do GitHub em pasta temporária sem espaço: `npm ci` e `npm run check` passam.
6. Guia de instalação e roteiro de limpeza revisados por Daniel; o roteiro lista o que se perde por não estar no GitHub.
7. `C:\migracao-pc` tem lista do conteúdo e não tem token de login nem chave de API.
8. **Lint e tipos: zero erros e zero avisos.** Suíte inteira passando.

## Plano de testes

- **T02:** teste antes para `emit` sem gravação de estado e para os comandos e hooks que restam; busca por referências sobrando; `hx metrics S18` e `hx usage` antes e depois.
- **T04:** testes de `hx setup` com pastas temporárias (caminho novo, config antiga com os caminhos do notebook, rodar duas vezes). Casos de erro no handoff: config inexistente ou com JSON quebrado, pasta sem permissão.
- **T07:** clone limpo em pasta temporária, `npm ci` e `npm run check`; apagar a pasta temporária no fim.
- **T01 e T08:** conferência dos diffs e da lista de arquivos procurando segredos.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Salvar e enviar o pendente dos 3 projetos, sem segredos; conferir tags e repos privados | tech-lead | repos Main Harness, financeiro, RE Multimidia | — | 40 min | 17 min |
| T02 | Remover dashboard e extensão do código, hooks e testes; rebuild do `hx` | clone (sonnet) | `extension/`, `cli/src/`, `cli/test/`, `cli/dist/hx.js`, `hooks/hooks.json`, `scripts/`, `package.json`, `package-lock.json` | T01 | 120 min | 52 min |
| T03 | Atualizar documentos da remoção: contratos, ADR 0019, PRD 0001, README, roadmap, B158 cancelado | clone (sonnet) | `docs/contracts/`, `docs/adr/`, `docs/prd/`, `docs/roadmap.md`, `docs/backlog.md`, `README.md`, `agents/`, `templates/` | T02 | 60 min | 26 min |
| T04 | Harness sem caminhos fixos da máquina (`hx setup` e config) | clone (sonnet) | `cli/src/core/config.ts`, `cli/src/commands/setup.ts`, `cli/test/setup.test.ts`, `cli/dist/hx.js` | T02 | 60 min | 26 min |
| T05 | Guia de instalação no PC pessoal e roteiro de testes no Desktop | tech-lead | `docs/instalacao-pc-pessoal.md` | T03, T04 | 45 min | 19 min |
| T06 | Roteiro de limpeza do notebook corp, com levantamento só de leitura | tech-lead | `docs/limpeza-notebook-corp.md` | T03, T04 | 40 min | 17 min |
| T07 | Revisão final, CHANGELOG, clone limpo e envio ao GitHub | tech-lead + reviewer | `CHANGELOG.md`, `index.md` | T05, T06 | 60 min | 26 min |
| T08 | Pacote de cópia em `C:\migracao-pc`, com lista | tech-lead | `C:\migracao-pc` (fora do repo) | T07 | 30 min | 13 min |

**Ondas:** onda 1 = T01; onda 2 = T02; onda 3 = T03, T04; onda 4 = T05, T06; onda 5 = T07; onda 6 = T08

Formato único (`onda N = Txx, Txx; onda M = ...`): quais tarefas rodam juntas. O Reviewer revisa cada onda dentro das tarefas (sem linha própria na tabela).

Depois do `hx sprint close`, copiar de novo a pasta `.harness` e enviar o Release Report ao GitHub.

**Histórico (hx metrics):** só a S18 tem os indicadores completos.

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| S18 | 2 h 11 min | 1 h 35 min (45 min de trabalho) | 2 h 58 min | 1 h 17 min |

Fator: soma 0,43; relógio 0,34 (sem a espera por Daniel). Minutos de agente.

**Total estimado:** 196 min planejados (455 brutos). Relógio: caminho mais longo (T01 → T02 → T03 → T05 → T07 → T08, 355 min brutos) ≈ 2 h de agente, mais a espera por Daniel.

## O que Daniel faz

- Criar no GitHub um repositório **privado e vazio** para o RE Multimidia e informar o nome (antes da T01).
- Avisar para fechar outros chats abertos no financeiro e no RE Multimidia.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-11-26 15:37:53 (horário de Brasília) — UTC 2026-11-26T18:37:53Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `77eeafebdbed5527a25a56d586a907bf1114f8ab853d6a93f2f6208c1c3e266e`
- **Versão do harness:** 0.16.0
