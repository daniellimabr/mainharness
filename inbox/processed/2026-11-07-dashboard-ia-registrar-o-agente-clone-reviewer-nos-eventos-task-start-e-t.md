# Pedido ao harness: Registrar o agente (clone/reviewer) nos eventos task.start e task.phase

- **Projeto:** dashboard-ia
- **Data:** 2026-11-07
- **Sprint:** S15
- **Prioridade:** media

## O que precisa

Os eventos task.start/task.phase/review.result de tarefa trazem sempre agent=tech-lead (quem roda o hx), mesmo quando o clone executa; o agent.start do clone vem com task=null. Precisamos que o evento de tarefa leve o agent_id/tipo do clone que executa (ex.: hx task start TNN --agent <id>, ou cruzar agent.start com a tarefa).

## Por quê

O dashboard (S15) mostra quem participou de cada tarefa; hoje o clone nunca aparece nos dados reais, so Tech Lead e Reviewer.

## Exemplo

—
