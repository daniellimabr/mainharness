# S01 — Filtro por data e exportação CSV de pedidos

- **Projeto:** loja-pedidos
- **Versão do harness:** sem dado
- **Status:** aguardando aprovação

## Objetivo

Daniel recebe a lista de pedidos com filtro por intervalo de datas e um botão "Exportar CSV" que baixa exatamente os pedidos filtrados, pronto para abrir no Excel em português.

## Escopo

1. Filtro "De" / "Até" na lista de pedidos, pela data de criação do pedido, dias inclusivos, no fuso America/Sao_Paulo. Pode usar só um dos lados.
2. API de pedidos aceita `from` e `to` (formato `AAAA-MM-DD`) e devolve 400 para data malformada ou `from` maior que `to`.
3. Botão "Exportar CSV" que baixa `pedidos-AAAA-MM-DD.csv` com todos os pedidos do filtro atual (todas as páginas), com as mesmas colunas da lista.
4. CSV em UTF-8 com BOM, separador `;`, cabeçalho em português, datas `dd/mm/aaaa`, valores com vírgula decimal, campos com `;`, aspas ou quebra de linha escapados.
5. Limite de 10.000 linhas por exportação; acima disso, a API recusa e a tela pede para refinar o filtro.

## Fora de escopo

Vai para `docs/backlog.md`:

- Atalhos de período ("hoje", "últimos 7 dias", "este mês").
- Filtro salvo na URL (manter o filtro ao recarregar a página).
- Exportação em Excel (.xlsx) ou PDF.
- Exportação assíncrona para volumes acima de 10.000 linhas (gerar em segundo plano e avisar).
- Escolher colunas do CSV.

## Critérios de aceite

1. Com "De" e "Até" preenchidos, a lista mostra só pedidos criados entre 00:00 de "De" e 23:59:59 de "Até" (horário de Brasília).
2. Com só "De" ou só "Até", o filtro funciona com o outro lado em aberto. Limpar o filtro volta à lista completa.
3. "De" maior que "Até" mostra mensagem de erro na tela e não faz a busca; a API devolve 400 para esse caso e para data malformada.
4. "Exportar CSV" baixa `pedidos-AAAA-MM-DD.csv` com todos os pedidos do filtro atual, inclusive os que estão em outras páginas, e nenhum fora dele.
5. O CSV abre certo no Excel pt-BR: acentos corretos, uma coluna por campo, datas `dd/mm/aaaa`, valores com vírgula; campos com `;`, aspas ou quebra de linha não quebram as colunas.
6. Lista vazia: botão "Exportar CSV" desabilitado.
7. Filtro com mais de 10.000 pedidos: a API devolve 422 sem gerar o arquivo e a tela mostra "Muitos pedidos para exportar. Refine o filtro."
8. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

Teste antes do código em toda tarefa (skill `tdd-workflow`).

| Critério | Tipo | O que prova |
|---|---|---|
| 1 | Unitário (`orderQuery`) + integração (rota) | Bordas: pedido às 00:00 de "De" e às 23:59:59 de "Até" entram; 23:59:59 da véspera e 00:00 do dia seguinte ficam fora; conversão de fuso para UTC correta. |
| 2 | Unitário (`orderQuery`, `DateRangeFilter`) | Só `from`, só `to` e nenhum geram a consulta certa; botão "Limpar" zera os campos. |
| 3 | Unitário (`orderQuery`, `DateRangeFilter`) + integração (rota) | `from > to`, `2026-13-01`, `abc` → 400 na API; na tela, mensagem e nenhuma chamada à API. |
| 4 | Integração (rota de exportação) + E2E | 60 pedidos com página de 20: CSV tem 60 linhas + cabeçalho, todas dentro do filtro. E2E clica no botão e confere o arquivo baixado. |
| 5 | Unitário (`ordersCsv`) | BOM no início, `;` como separador, escape de `;`, `"` e `\n`, `ç/ã/é` corretos, data e valor no formato pt-BR. |
| 6 | Unitário (`ExportCsvButton`) | Botão desabilitado com lista vazia, habilitado com itens. |
| 7 | Integração (rota) + unitário (`ExportCsvButton`) | Contagem acima de 10.000 → 422 sem gerar arquivo (limite injetado baixo no teste para não criar 10.001 linhas); botão mostra a mensagem. |
| 8 | Verificação | Lint e checagem de tipos no projeto todo, saída sem erros e sem avisos. |

**Dados de teste:** fábrica de pedidos com datas fixas nas bordas do intervalo e nomes de cliente com `;`, aspas, quebra de linha e acentos. Integração roda dentro de transação desfeita ao fim de cada teste. E2E cria os pedidos pela fábrica no `beforeAll` e apaga pelos ids criados no `afterAll`.

## Tarefas

Caminhos assumidos a partir da estrutura padrão do harness (TypeScript); se o código real usar outros nomes, o Tech Lead ajusta na T01 e o plano volta para aprovação.

| Id | Tarefa | Agente | Arquivos | Estimativa |
|---|---|---|---|---|
| T01 | Contrato: tipos do filtro (`from`, `to`), limite de exportação e formato de erro | tech-lead | `src/shared/orders/orderFilters.ts` | 30 min |
| T02 | Validação do intervalo e montagem da consulta com fuso de Brasília | clone-a | `src/server/orders/orderQuery.ts`, `src/server/orders/orderQuery.test.ts` | 1 h |
| T03 | Gerador de CSV (BOM, `;`, escape, formatos pt-BR) | clone-b | `src/server/orders/ordersCsv.ts`, `src/server/orders/ordersCsv.test.ts` | 1 h |
| T04 | Componente de filtro "De" / "Até" com validação e "Limpar" | clone-c | `src/web/orders/DateRangeFilter.tsx`, `src/web/orders/DateRangeFilter.test.tsx` | 1 h 30 min |
| T05 | Botão "Exportar CSV" (desabilitado se vazio, download, mensagem de limite) | clone-d | `src/web/orders/ExportCsvButton.tsx`, `src/web/orders/ExportCsvButton.test.tsx` | 45 min |
| T06 | Rotas: `GET /orders?from&to` e `GET /orders/export.csv` com limite de 10.000 | tech-lead | `src/server/orders/ordersRoutes.ts`, `src/server/orders/ordersRoutes.test.ts` | 1 h |
| T07 | Integração na tela de pedidos + teste E2E + `index.md` | tech-lead | `src/web/orders/OrdersPage.tsx`, `e2e/orders-filter-export.spec.ts`, `index.md` | 1 h |
| T08 | Documentar os parâmetros `from`/`to` e a rota de exportação | writer | `docs/api/orders.md` | 20 min |
| T09 | Revisão: lint e tipos zerados, testes, `main-harness:security-review`, critérios de aceite 1 a 8 | reviewer | (só leitura) | 45 min |

**Paralelismo:** depois da T01, as tarefas T02, T03, T04, T05 e T08 rodam em paralelo (clones e writer, sem arquivo em comum). T06 depende de T02 e T03. T07 depende de T04, T05 e T06. T09 é a última.

**Tempo total planejado:** 7 h 50 min.

## Aprovação

- **Aprovado por:** _pendente_
- **Data/hora (UTC):** _pendente_
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): _pendente_
- **Versão do harness:** _pendente_

<!-- Preenchido por `hx sprint approve SNN` após o ok de Daniel. Qualquer mudança acima desta seção invalida a aprovação. A seção "## Execução" é criada por `hx sprint open` e fica fora do hash. -->
