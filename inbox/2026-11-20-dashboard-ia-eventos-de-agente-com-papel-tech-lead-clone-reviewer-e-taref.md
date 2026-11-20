# Pedido ao harness: Eventos de agente com papel (tech-lead/clone/reviewer) e tarefa, agente ativo e estado.json por projeto

- **Projeto:** dashboard-ia
- **Data:** 2026-11-20
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

1) Todo evento de agente (task.start, task.phase, review.result, usage, agent.start/end) traz o papel real (tech-lead, clone ou reviewer) e a tarefa (TNN) em que atua; hoje clones e Reviewer chegam como tech-lead e sem tarefa. 2) Evento explicito de agente ativo (agent.start/agent.end ligados a tarefa). 3) O hx grava um estado.json pequeno por projeto (sprint ativa, tarefas com status, agentes ativos, custo por tarefa ao fechar) para o painel ler sem reprocessar o historico.

## Por quê

O Harness Dash (extensao do VS Code, S16 do dashboard-ia) precisa mostrar clones e Reviewer de forma diferenciada e ficar leve, sem servidor. Substitui o pedido da S15 (papel nos eventos task.start/task.phase), agora prioridade alta.

## Exemplo

—
