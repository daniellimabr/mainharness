---
name: prd
description: "Escreve o PRD (documento de requisitos de produto) de uma funcionalidade em docs/prd/NNNN-slug.md: problema, usuários, objetivo e métricas, escopo e fora de escopo, requisitos, critérios de aceite, riscos e perguntas em aberto. Use SEMPRE que Daniel descrever uma funcionalidade nova ou grande e antes de planejar a sprint, ou pedir 'PRD', 'requisitos', 'especificação do produto'. Não use para ADR, README ou sprint plan."
argument-hint: "<nome da funcionalidade>"
---

# PRD: requisitos de uma funcionalidade

O PRD diz **o quê e por quê**, não **como**. A decisão técnica vai para um ADR (skill `adr`). O PRD alimenta o sprint plan (skill `sprint-plan`).

## Quando criar

- Funcionalidade nova, ou mudança grande de comportamento.
- Pedido vago de Daniel que precisa virar algo verificável antes de virar tarefas.
- Não crie PRD para correção pequena: ela vai direto para o backlog ou para a sprint.

## Passos

1. **Entenda antes de escrever.** Leia o pedido (inbox, `docs/backlog.md`, conversa). Faça no máximo 5 perguntas a Daniel, de uma vez, só sobre o que muda o resultado (quem usa, o que dói, o que é sucesso, o que fica de fora). O que ele não souber vira pergunta em aberto, não palpite.
2. **Número e slug:** liste `docs/prd/`; novo número = maior `NNNN` + 1 (4 dígitos; vazio = `0001`). Arquivo: `docs/prd/NNNN-<slug>.md`, slug em minúsculas e hífens.
3. **Modelo:** copie `${CLAUDE_PLUGIN_ROOT}/templates/prd.md` e complete as seções abaixo (acrescente as que faltarem no modelo).
4. Preencha:
   - **Problema:** quem sofre, o que acontece hoje, qual o custo.
   - **Usuários:** quem usa e em que situação (poucos perfis, concretos).
   - **Objetivo e métricas:** resultado esperado e como medir (número, prazo, de onde vem o dado). Sem métrica possível, diga isso.
   - **Escopo / Fora de escopo:** listas curtas. O fora de escopo evita que a sprint cresça.
   - **Requisitos:** numerados (R1, R2...), cada um verificável, sem escolher tecnologia.
   - **Critérios de aceite:** numerados, em termos que dá para testar (dado/quando/então). Inclua sempre "Lint e tipos: zero erros e zero avisos".
   - **Riscos:** o que pode dar errado e o plano de reduzir.
   - **Perguntas em aberto:** cada uma com quem decide.
5. **Status:** `rascunho` até Daniel aprovar; então `aprovado` e data.
6. Termine com o resumo em 3 linhas e o pedido de ok. Depois do aprovado, ofereça o próximo passo: planejar a sprint.

## Regras

- Português do Brasil, frases curtas, sem jargão.
- Nada de solução técnica disfarçada de requisito ("usar React" não é requisito).
- Requisito que não dá para testar é reescrito ou vira pergunta em aberto.
- Mudou o PRD depois de aprovado: registre a mudança no fim do arquivo (data e o quê) e peça novo ok.

## Antes de terminar

- [ ] Todo requisito tem pelo menos um critério de aceite que o cobre.
- [ ] Fora de escopo preenchido.
- [ ] Perguntas em aberto têm dono.
- [ ] Nenhum chute apresentado como fato.
