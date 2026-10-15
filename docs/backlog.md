# Backlog do Main Harness

Itens ainda não planejados. Pedidos dos projetos chegam pelo `inbox/` e `/inbox` os traz para cá. Melhorias vindas de retrospectivas entram via `hx request`.

- **Origem:** `inbox`, `retro` ou `roadmap`.
- **Prioridade:** alta, média, baixa.
- **Status:** `aberto`, `planejado (SNN)`, `feito (SNN)` ou `descartado`.

| Id | Item | Origem | Prioridade | Status |
|---|---|---|---|---|
| B001 | Voltar ao "chat novo + Enter" se a compactação gerenciada falhar (ADR 0006). Condicional: só se os indicadores mostrarem retrabalho ou tarefas esquecidas após compactação | roadmap | baixa | aberto |
| B002 | Aplicar as recomendações do `claude-code-setup` ligadas a evidência no repo (roadmap 1) | roadmap | alta | aberto |
| B003 | Evoluir para cópias isoladas do repo (git worktrees) se houver colisão de arquivos entre agentes | roadmap | baixa | aberto |
| B004 | Remover duplicações apontadas na revisão da S00: wrappers de git em 4 lugares, `runTool` × `runFixed`, `ESLINT_CONFIGS` repetido (Ponytail) | retro | média | aberto |
| B005 | Retomar a sessão sozinho após o limite de uso (ex.: tarefa agendada às 04:30). Bloqueado pelo classificador de segurança do Claude Code; precisa de autorização explícita de Daniel | retro | baixa | aberto |
| B006 | Reduzir consumo: Reviewer no Sonnet para revisão de rotina; evals de skill no Sonnet (Daniel: não usar Haiku, para não perder qualidade) com 1 rodada por consulta; contar as sessões `claude -p` dos evals no `hx usage` (hoje ficam fora). S00: evals e Opus em tudo estouraram a franquia 3x | retro | alta | aberto |
| B007 | Voltar a `frontend-design` ao catálogo opcional (está em `skills-pending/`): o caso 1 dos evals falha 3x (o plano visual não aparece na resposta antes do código). Opções: adaptar mais o corpo ou rever a expectativa | retro | média | aberto |
| B008 | Acentos trocados na saída do `hx` no PowerShell 5.1 (só exibição; arquivos corretos). Avaliar forçar saída UTF-8 no console | retro | baixa | aberto |
