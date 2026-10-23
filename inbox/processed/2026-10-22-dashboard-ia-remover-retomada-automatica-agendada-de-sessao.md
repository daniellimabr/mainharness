# Pedido ao harness: Remover retomada automática agendada de sessão

- **Projeto:** dashboard-ia
- **Data:** 2026-10-22
- **Sprint:** S09
- **Prioridade:** alta

## O que precisa

Eliminar por completo o agendamento automático que retoma a sessão/sprint após falta de créditos (despertador interno/ScheduleWakeup/cron). Nenhuma sessão deve se retomar sozinha; a retomada passa a ser só manual (/main-harness:continue).

## Por quê

Em 22/10 às 17:52 a retomada automática acordou 6 agentes ao mesmo tempo com cache expirado: ~1,7M tokens regravados e 12,7M relidos em 4 min (19-30% da franquia). Sem Daniel presente, todo comando pedia aprovação, PowerShell estourava o tempo e os clones pararam sem fazer nada. Daniel vai pensar depois numa forma melhor de automatizar.

## Exemplo

—
