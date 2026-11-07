# Pedido ao harness: Sala de controle (S53): só mostra tarefas já iniciadas e vem com dados faltando

- **Projeto:** financeiro
- **Data:** 2026-11-07
- **Sprint:** S53
- **Prioridade:** media

## O que precisa

Na S53 do repo financeiro (attach feito em 2026-11-07, harness 0.15.0), a Sala de controle mostrou: (1) 'Tarefas da sprint 1/2 concluídas' com só T01 (feita) e T05 (rodando), embora o plano e o 'hx task' tenham 5 tarefas (T02, T03, T04 não aparecem, pois ainda não começaram); T05 foi adicionada ao plano depois, com nova aprovação, e T02-T04 sumiram desde a abertura; (2) coluna Tarefa mostra 'T01 T01' (sem o título da tarefa); (3) 'Plano onda sem dado' e 'Sem onda' (o plano não declara ondas e S52 tinha o mesmo formato); (4) 'Plano no tempo: sem plano de horários' (plano não tem previsão por tarefa); (5) Agente de T01 aparece como tech-lead Sonnet, mas T01 rodou em clone Sonnet; (6) Consumo por tarefa vazio (—); (7) 'Fim previsto 23:52' em T01 igual ao fim real. Pode ser falha do attach recente, parser da tabela do plano (colunas '# | Tarefa | Agente | Arquivos que toca | Pronto quando') ou o painel ler só tarefas com início. Nunca tinha acontecido antes segundo Daniel. Esperado: todas as tarefas do plano listadas desde 'hx sprint open', com título, agente do plano e estado ⬜. Dado de apoio: tabela do hx (hx task) mostra as 5 tarefas corretamente.

## Por quê

Daniel acompanha a execução da sprint pela Sala de controle; sem as tarefas pendentes não dá para ver o que falta nem o andamento real.

## Exemplo

—
