# Pedido ao harness: Calibrar estimativa do sprint plan para tempo de agente (S01 claude-tray: 24x acima do real)

- **Projeto:** claude-tray
- **Data:** 2026-11-05
- **Sprint:** —
- **Prioridade:** media

## O que precisa

O plano estima em horas de dev humano e o hx metrics usa fator 1 sem historico. Sugestoes: (1) o sprint-plan deve estimar em minutos de agente, nao horas humanas; (2) fator inicial default menor que 1 quando nao ha sprint fechada, ou pedir uma amostra; (3) mostrar no dashboard a razao planejado/real por tarefa, por tipo de tarefa e por agente, e alimentar o fator automaticamente; (4) separar no dashboard tempo de agente, fila, revisao e espera por Daniel.

## Por quê

S01 do claude-tray: planejado 5 h 10 min (soma) e 4 h 50 min de relogio; real 13 min (soma) e 18 min corridos, ou seja 24x e 16x. Por tarefa: T01 20 vs 2 min, T02 40 vs 2, T03 90 vs 2, T04 120 vs 6, T05 40 vs 2. Todas Sonnet, um so arquivo Python, TDD com testes sinteticos, 1 reprovacao. Espera por Daniel 32 min foi maior que o trabalho (6 min), entao a estimativa humana engana o planejamento do dia.

## Exemplo

—
