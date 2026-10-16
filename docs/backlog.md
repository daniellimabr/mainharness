# Backlog do Main Harness

Itens ainda não planejados. Pedidos dos projetos chegam pelo `inbox/` e `/inbox` os traz para cá. Melhorias vindas de retrospectivas entram via `hx request`.

- **Origem:** `inbox`, `retro` ou `roadmap`.
- **Prioridade:** alta, média, baixa.
- **Status:** `aberto`, `planejado (SNN)`, `feito (SNN)` ou `descartado`.

| Id | Item | Origem | Prioridade | Status |
|---|---|---|---|---|
| B001 | Voltar ao "chat novo + Enter" se a compactação gerenciada falhar (ADR 0006). Condicional: só se os indicadores mostrarem retrabalho ou tarefas esquecidas após compactação | roadmap | baixa | descartado (por ora; reativar se fizer sentido) |
| B002 | Aplicar as recomendações do `claude-code-setup` ligadas a evidência no repo (roadmap 1) | roadmap | alta | aberto |
| B003 | Evoluir para cópias isoladas do repo (git worktrees) se houver colisão de arquivos entre agentes | roadmap | baixa | descartado (por ora; reativar se fizer sentido) |
| B004 | Remover duplicações apontadas na revisão da S00: wrappers de git em 4 lugares, `runTool` × `runFixed`, `ESLINT_CONFIGS` repetido (Ponytail) | retro | média | feito (S01) |
| B005 | Retomar a sessão sozinho após o limite de uso (ex.: tarefa agendada às 04:30). Bloqueado pelo classificador de segurança do Claude Code; precisa de autorização explícita de Daniel | retro | baixa | aberto |
| B006 | Reduzir consumo: Reviewer no Sonnet para revisão de rotina; evals de skill no Sonnet (Daniel: não usar Haiku, para não perder qualidade) com 1 rodada por consulta; contar as sessões `claude -p` dos evals no `hx usage` (hoje ficam fora). S00: evals e Opus em tudo estouraram a franquia 3x | retro | alta | feito (S01) |
| B007 | Voltar a `frontend-design` ao catálogo opcional (está em `skills-pending/`): o caso 1 dos evals falha 3x (o plano visual não aparece na resposta antes do código). Opções: adaptar mais o corpo ou rever a expectativa | retro | média | aberto |
| B008 | Acentos trocados na saída do `hx` no PowerShell 5.1 (só exibição; arquivos corretos). Avaliar forçar saída UTF-8 no console. S01: no PowerShell do Claude Code a saída já vem certa (console em UTF-8). No console de Daniel (página 850), a saída direta também sai certa, porque o Node escreve em Unicode no console; só quebra ao passar a saída por `\|`, porque o PowerShell 5.1 fixa a codificação ao abrir, e um `chcp` no `hx.cmd` não muda isso. Texto mandado do PowerShell para o `hx` pela entrada perde os acentos (vira `?`), então o handoff vai pelo heredoc do Bash | retro | baixa | feito (S01) |
| B009 | Plugins companheiros (main-harness, ponytail, security-guidance) na mesma versão em todos os projetos: `hx release` atualiza, `hx doctor` avisa. Hoje o Dashboard IA está no ponytail 5.2.0 e os outros projetos no 4.8.4 | retro | alta | feito (S01) |
| B010 | Casos de eval de `adr` e `handoff` falham na rodada real da S01 por falta de fixtures (arquivos que o caso pressupõe) ou detalhe no prompt. Não bloqueia release (só `evals/` muda), mas precisa passar na próxima mudança de corpo dessas skills | retro | média | feito (S02) |
| B011 | Bash em pasta com espaço: orientar `cd "C:/Pasta Com Espaço"` (tech-lead, doctor) e checar no `hx doctor` | inbox: 2026-10-16-main-harness-bash-do-claude-code-em-pasta-com-espaco.md | média | feito (S02) |
| B012 | Evals da `sprint-plan`: caso 3 sem "edita o plano agora" no pedido; caso novo com pedido vago que espera perguntas antes do plano | inbox: 2026-10-16-main-harness-casos-da-sprint-plan-sem-dar-a-resposta.md | alta | feito (S02) |
| B013 | skill-creator e CLAUDE.md: prompt de caso de eval traz as decisões, para a skill escrever em vez de perguntar | inbox: 2026-10-16-main-harness-casos-de-eval-com-decisoes-no-prompt.md | baixa | feito (S02) |
| B014 | `sprint-plan` estima pelo histórico (`hx metrics`) e mostra planejado × real das sprints anteriores | inbox: 2026-10-16-main-harness-estimativa-calibrada-pelo-historico.md | alta | feito (S02) |
| B015 | Fase da tarefa na linha 🔄 da lista (testes, código, revisão, commit) via `hx task phase` | inbox: 2026-10-16-main-harness-fase-da-tarefa-na-lista.md | média | feito (S02) |
| B016 | Mensagens ao Daniel durante a sprint começam com `[TNN] Título:` + o que está fazendo (tech-lead e sprint-run) | inbox: 2026-10-16-main-harness-mensagens-ao-daniel-com-tarefa-no-inicio.md | alta | feito (S02) |
| B017 | `hx` recusa `HARNESS_HOME` relativo ou na raiz do disco, com erro claro e nada gravado | inbox: 2026-10-16-main-harness-recusar-harness-home-relativo-ou-na-raiz-do-disco.md | alta | feito (S02) |
| B018 | Total do `hx metrics`/`sprint close` mostra também o tempo corrido, além da soma das tarefas | inbox: 2026-10-16-main-harness-tempo-corrido-no-total-do-hx-metrics.md | média | feito (S02) |
