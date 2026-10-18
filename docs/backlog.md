# Backlog do Main Harness

Itens ainda não planejados. Pedidos dos projetos chegam pelo `inbox/` e `/inbox` os traz para cá. Melhorias vindas de retrospectivas entram via `hx request`.

- **Origem:** `inbox`, `retro` ou `roadmap`.
- **Prioridade:** alta, média, baixa.
- **Status:** `aberto`, `planejado (SNN)`, `feito (SNN)` ou `descartado`.

| Id | Item | Origem | Prioridade | Status |
|---|---|---|---|---|
| B001 | Voltar ao "chat novo + Enter" se a compactação gerenciada falhar (ADR 0006). Condicional: só se os indicadores mostrarem retrabalho ou tarefas esquecidas após compactação | roadmap | baixa | descartado (por ora; reativar se fizer sentido) |
| B002 | Aplicar as recomendações do `claude-code-setup` ligadas a evidência no repo (roadmap 1) | roadmap | alta | feito (S03) |
| B003 | Evoluir para cópias isoladas do repo (git worktrees) se houver colisão de arquivos entre agentes | roadmap | baixa | descartado (por ora; reativar se fizer sentido) |
| B004 | Remover duplicações apontadas na revisão da S00: wrappers de git em 4 lugares, `runTool` × `runFixed`, `ESLINT_CONFIGS` repetido (Ponytail) | retro | média | feito (S01) |
| B005 | Retomar a sessão sozinho após o limite de uso (ex.: tarefa agendada às 04:30). Bloqueado pelo classificador de segurança do Claude Code; precisa de autorização explícita de Daniel | retro | baixa | aberto |
| B006 | Reduzir consumo: Reviewer no Sonnet para revisão de rotina; evals de skill no Sonnet (Daniel: não usar Haiku, para não perder qualidade) com 1 rodada por consulta; contar as sessões `claude -p` dos evals no `hx usage` (hoje ficam fora). S00: evals e Opus em tudo estouraram a franquia 3x | retro | alta | feito (S01) |
| B007 | Voltar a `frontend-design` ao catálogo opcional (está em `skills-pending/`): o caso 1 dos evals falha 3x (o plano visual não aparece na resposta antes do código). Opções: adaptar mais o corpo ou rever a expectativa | retro | média | feito (S03) |
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
| B019 | `hx run` com vitest pelo Bash em pasta com espaço falha (`reading config`); corrigir a causa (provável `c:` × `C:` no cwd) | inbox: 2026-10-16-main-harness-hx-run-com-vitest-pelo-bash-em-pasta-com-espaco.md | baixa | feito (S03) |
| B020 | Painel do ponytail desligado por padrão: `hx setup` grava `~/.claude/.ponytail-band=off` e garante `HOME` no Windows (sem ele o ponytail não lê o flag); `hx doctor` avisa | inbox: 2026-10-16-main-harness-painel-do-ponytail-desligado-por-padrao-nas-maquinas-do-harn.md | média | feito (S03) |
| B021 | `hx sprint close`: tempo corrido das tarefas (1º start ao último done) e, à parte, a espera até o fechamento | inbox: 2026-10-16-main-harness-sprint-close-mostra-tempo-corrido-nao-tempo-desde-o-open.md | média | feito (S03) |
| B022 | sprint-run e tech-lead: lista nativa de tarefas só se a ferramenta existir (não existe no VS Code) | inbox: 2026-10-16-main-harness-sprint-run-sem-lista-nativa-no-vs-code.md | baixa | feito (S03) |
| B023 | Hook PreToolUse em `Write\|Edit` (`hx hook pre-edit`) bloqueia edição de `cli/dist/hx.js` e de `C:\harness-stable`; hoje o `pre-bash` só vigia o shell (`hooks/hooks.json`, matcher `Bash\|PowerShell`) | roadmap (auditoria S03) | alta | planejado (S04) |
| B024 | `pre-bash` pergunta antes de `git commit` com `cli/src` no stage e `cli/dist/hx.js` desatualizado (regra do `CLAUDE.md` sem garantia) | roadmap (auditoria S03) | alta | planejado (S04) |
| B025 | `index.md` com linhas duplicadas (ex.: `cli/test/review-security-recheck.test.ts`); achar a causa em `cli/src/repomap/` | roadmap (auditoria S03) | alta | planejado (S04) |
| B026 | Checar tipos no fim da vez (Stop hook roda typecheck quando `cli/src` mudou); hoje o `post-edit` só formata e lint | roadmap (auditoria S03) | média | planejado (S04) |
| B027 | `.claude/settings.json`: liberar comandos só de leitura (`npm run *`, `git status/diff/log`, Bash e PowerShell); usar a skill `fewer-permission-prompts` | roadmap (auditoria S03) | média | planejado (S04) |
| B028 | `hx release` valida o manifesto do plugin (`claude plugin validate`, plugin `plugin-dev`) antes de publicar | roadmap (auditoria S03) | média | aberto |
| B029 | CI (GitHub Action) com `npm run check` e `npm run build` + diff de `cli/dist` | roadmap (auditoria S03) | baixa | aberto |
| B030 | Validar com o Dashboard o ciclo de pedidos ao harness: `hx request` no projeto → `inbox/` → `/inbox` → backlog → sprint → release → o projeto recebe a correção (e fica sabendo) | roadmap (Daniel, S03) | alta | planejado (S05) |
| B031 | `sprint-plan` sugere estimativas pelo real das sprints anteriores (`hx metrics`) | inbox: 2026-10-16-dashboard-ia-calibrar-estimativas-do-sprint-plan-pelo-historico.md | média | planejado (S04) |
| B032 | Eventos do harness em `~/.main-harness/events/AAAA-MM-DD.jsonl` (sessão, agentes, sprint, tarefa, revisão, consumo) para o Dashboard IA | inbox: 2026-10-16-dashboard-ia-gravar-eventos-do-harness-em-arquivo-para-o-dashboard-ia.md | alta | planejado (S05) |
| B033 | Navegador headless (Playwright) para o Reviewer testar telas (tema escuro, 360 px, recarregar) | inbox: 2026-10-16-dashboard-ia-navegador-para-o-reviewer-testar-telas.md | alta | descartado (fica com cada projeto) |
| B034 | Registro central `~/.main-harness/projects.json` com id fixo por projeto (gerado no attach, em `.claude/harness.json`) | inbox: 2026-10-16-dashboard-ia-registro-central-de-projetos-com-id-fixo.md | alta | planejado (S05) |
| B035 | Duração da tarefa até a fase revisão separada do tempo até o done (fila da revisão da onda) | inbox: 2026-10-16-main-harness-duracao-da-tarefa-sem-a-espera-pela-revisao-da-onda.md | baixa | planejado (S04) |
| B036 | `hx eval` reexecuta só os casos/consultas que falharam, mantendo o carimbo | inbox: 2026-10-16-main-harness-hx-eval-roda-so-os-casos-que-falharam.md | média | planejado (S04) |
| B037 | Tempo corrido desconta pausas sem eventos acima de ~30 min (`hx metrics`, `sprint close`) | inbox: 2026-10-16-main-harness-tempo-corrido-desconta-pausas-longas-da-sessao.md | média | planejado (S04) |
| B038 | `sprint-plan` mostra razão real/planejado das sprints anteriores e a usa na estimativa | inbox: 2026-10-18-dashboard-ia-calibrar-estimativas-com-o-historico.md | média | planejado (S04) |
| B039 | Estimativa calibrada por padrão: fator real/planejado do projeto, bruta × calibrada no plano, tempo de agente × espera por Daniel (substitui B031/B038) | inbox: 2026-10-18-dashboard-ia-estimativas-de-sprint-muito-acima-do-real-urgente-antes-da-s.md | alta | planejado (S04) |
| B040 | `hx sprint feedback` mede início/fim de cada rodada de ajuste (tempo e custo) | inbox: 2026-10-18-dashboard-ia-medir-o-tempo-das-rodadas-de-ajuste.md | média | planejado (S04) |
| B041 | Agentes leem/buscam/editam só com Read/Grep/Glob/Edit/Write; shell sem `cd` nem `/c/...` (prompts, handoff; avaliar hook) | inbox: 2026-10-18-dashboard-ia-padronizar-exploracao-e-edicao-de-arquivos-pelos-agentes-win.md | alta | planejado (S04) |
| B042 | Bloqueio de `Remove-Item` não trata caminho entre aspas com espaço dentro do repo como caminho de sistema | inbox: 2026-10-18-dashboard-ia-remove-item-bloqueado-em-caminho-com-espaco.md | alta | planejado (S04) |
