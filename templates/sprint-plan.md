# SNN — Título curto da sprint

- **Projeto:** nome-do-projeto
- **Versão do harness:** 0.0.0
- **Status:** aguardando aprovação

## Objetivo

Uma ou duas frases: o que Daniel recebe ao fim da sprint.

## Escopo

1. Entrega concreta.
2. Entrega concreta.

## Fora de escopo

O que fica para depois (vai para o backlog).

## Critérios de aceite

1. Critério verificável.
2. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários:** o que cada tarefa testa antes do código (tdd-workflow).
- **Integração/E2E:** fluxos ponta a ponta, dados de teste, limpeza.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Descrição curta | tech-lead | `caminho/arquivo` | — | 40 min | 20 min |
| T02 | Descrição curta | tech-lead | `caminho/arquivo` | T01 | 2 h | 1 h |
| T03 | Revisão final e release: lint e tipos zerados, testes, critérios de aceite | tech-lead + reviewer | `CHANGELOG.md` | T02 | 1 h | 30 min |

**Ondas:** onda 1 = T01, T02; onda 2 = T03

Formato único (`onda N = Txx, Txx; onda M = ...`): quais tarefas rodam juntas. O Reviewer revisa cada onda dentro das tarefas (sem linha própria na tabela).

**Histórico (hx metrics):**

| Sprint | Previsto | Corrido | Soma planejada | Soma real |
|---|---|---|---|---|
| SNN | 1 h | 30 min | 2 h | 1 h |

Fator: relógio X%, soma Y%; média = fator padrão. Sprint fora da média: motivo. (Sem histórico: fator padrão das S15 e S16, soma 0,25 e relógio 0,33.) Estimativas em minutos de agente, não de dev humano.

**Total estimado:** soma calibrada (bruta). Relógio: caminho mais longo × fator relógio (tempo de agente) + espera por Daniel (teste e ajustes), à parte.

## Aprovação

- **Aprovado por:** _pendente_
- **Data/hora (UTC):** _pendente_
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): _pendente_
- **Versão do harness:** _pendente_

<!-- Preenchido por `hx sprint approve SNN` após o ok de Daniel. Qualquer mudança acima desta seção invalida a aprovação. A seção "## Execução" é criada por `hx sprint open` e fica fora do hash. -->
