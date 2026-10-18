# Pedido ao harness: Gravar eventos do harness em arquivo para o Dashboard IA

- **Projeto:** dashboard-ia
- **Data:** 2026-10-16
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Hooks e hx gravam cada evento como uma linha JSON em ~/.main-harness/events/AAAA-MM-DD.jsonl (append, sem rede). Campos: v, ts, projectId, sessionId, parentSessionId (clone/reviewer), type, dados. Tipos: session.start/end, agent.start/end (subagentes), todo.update (lista nativa de tarefas), sprint.approved/opened/closed/feedback, task.start/phase/done, review.pass/fail, usage (tokens in/out/cache por mensagem e modelo).

## Por quê

O Dashboard IA mostra em quase tempo real chats, agentes, sprints, tarefas (inicio/fim/duracao) e consumo por projeto. Arquivo local nao perde evento com o painel fechado e depois pode ser enviado para um servidor online.

## Exemplo

{"v":1,"ts":"2026-10-16T16:30:00Z","projectId":"prj_7f3a","sessionId":"abc","type":"task.start","sprint":"S01","task":"T02"}
