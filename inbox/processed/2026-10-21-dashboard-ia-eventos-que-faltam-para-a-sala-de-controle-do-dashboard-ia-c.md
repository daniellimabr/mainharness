# Pedido ao harness: Eventos que faltam para a Sala de controle do Dashboard IA (completa o B032)

- **Projeto:** dashboard-ia
- **Data:** 2026-10-21
- **Sprint:** S04
- **Prioridade:** alta

## O que precisa

Gravar: agent.start e agent.end com id do agente e tarefa (clone, reviewer); título do chat no session.start; um evento por comando de Daniel (hook UserPromptSubmit, só metadados: horário e sessão); project.status opcional com onde parou e próximo passo; uma fonte para o % do limite da assinatura (5 h e semanal). Incluir também task.phase na tabela do contrato events.md (já é gravado, mas não está documentado).

## Por quê

Na S04 o Dashboard passou a ler só os eventos v1. Sem esses tipos, os agentes rodando são aproximados pelo campo agent dos eventos, o 'desde o seu último comando' usa o último session.start, o chat aparece com o id da sessão e o limite continua estimado.

## Exemplo

{"type":"agent.start","agent":"clone","task":"T02","data":{"agent_id":"a1b2"}}
