# S18: conferência do estado contra o Dashboard IA

Data: 2026-11-20. Critério do plano: total do estado dentro de 1% do dashboard atual.

Método: `hx state rebuild --all`; o Dashboard IA (API local, porta 5174) foi subido só para leitura. Comparei a soma do custo das sprints em cada lado.

| Projeto | Estado (soma das sprints, US$) | Dashboard IA (US$) | Diferença |
|---|---|---|---|
| claude-tray | 3,16 | 3,04 | +3,9% |
| dashboard-ia | 124,86 | 120,45 | +3,7% |
| main-harness | 289,31 | 302,96 | −4,5% |
| 6thgear | 183,87 | 265,30 | −30,7% |
| financeiro | 22,09 | 52,79 | −58,2% |

Total do projeto no estado (inclui consumo fora de sprint): main-harness 348,56; dashboard-ia 162,88; 6thgear 278,48; financeiro 36,72; claude-tray 5,05.

Por sprint (main-harness): S13 19,55 × 19,20; S14 5,21 × 8,80; S15 4,05 × 3,84; S16 10,38 × 10,54; S17 27,61 × 35,78; S18 7,36 × 7,97.

## Resultado: fora de 1%

Nenhum projeto fecha em 1%. Causa provável (não confirmada): as duas fontes são diferentes. O dashboard calcula pelas transcrições dos chats (inclui chats que o `hx` não viu, e vale também para sprints antigas), e o estado usa só os eventos `usage` do `hx`, que existem desde a S05 e só carregam tarefa e agente desde a S13/S17. Projetos antigos (6thgear, financeiro) têm eventos incompletos, daí os −30% e −58%.

Decisão para Daniel: aceitar que o estado reflete só o que o `hx` registrou (e relaxar o critério para "projetos com eventos completos"), ou investigar sprint a sprint o que o dashboard soma a mais (ex.: S14 e S17 do main-harness). T11 (arquivar o Dashboard IA) fica parada até essa decisão.
