# Pedido ao harness: Projetos conectados geram plano fora do padrão e eventos de clone como tech-lead

- **Projeto:** dashboard-ia
- **Data:** 2026-11-07
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Garantir que o sprint-plan produza a tabela padrão (Id, Tarefa, Agente, Arquivos, Depende de, Bruta, Planejado) e a linha **Ondas:**, e que os eventos de clones (task.*, usage) levem o agente/agent_id do clone, nao 'tech-lead'. Validar o plano ao aprovar (hx sprint approve) e recusar plano fora do formato.

## Por quê

No projeto financeiro (S52-S54) o plano veio com cabecalho '#', sem Depende de/Planejado, 'Ordem e paralelismo' em prosa, planned_min 0 e agent 'tech-lead' em todos os eventos; o Dashboard IA nao mostra tarefas, plano no tempo nem consumo.

## Exemplo

—
