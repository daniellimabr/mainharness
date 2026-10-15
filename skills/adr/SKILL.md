---
name: adr
description: "Registra uma decisão de arquitetura como ADR em docs/adr/NNNN-slug.md, com contexto, o que a documentação diz, alternativas, decisão e consequências. Use SEMPRE que Daniel e o Tech Lead escolherem entre abordagens técnicas (biblioteca, estrutura, formato, estratégia) ou pedirem para 'registrar a decisão', 'criar um ADR', 'documentar por que escolhemos X'. Não use para PRD, README ou sprint plan."
argument-hint: "<título da decisão>"
---

# ADR: registrar uma decisão de arquitetura

Um ADR guarda **por que** algo foi decidido, para ninguém reabrir a discussão sem motivo. Um ADR por decisão.

## Quando criar

- Escolha entre alternativas reais com custo de voltar atrás (biblioteca, formato de dados, estrutura de pastas, estratégia de teste ou de release).
- Decisão que Daniel tomou e que o código sozinho não explica.
- Não crie ADR para detalhe de implementação nem para tarefa de rotina.

## Passos

1. **Número:** liste `docs/adr/`. O novo número é o maior `NNNN` + 1, com 4 dígitos (`0008`). Pasta vazia: `0001`. Nunca reutilize número.
2. **Slug:** minúsculas, sem acento, hífens, até 5 palavras (`cache-de-consumo`). Arquivo: `docs/adr/NNNN-<slug>.md`.
3. **Modelo:** copie `${CLAUDE_PLUGIN_ROOT}/templates/adr.md` e preencha todas as seções.
4. **Evidência antes de opinião.** Em "O que a documentação diz", só entram fatos que você verificou (documentação oficial, código do repo, teste rodado), cada um com a fonte e a data. Não sabe? Pesquise ou escreva "não verificado". Nunca invente.
5. **Alternativas:** no mínimo duas, com prós e contras honestos. Inclua a de "não fazer nada" quando fizer sentido. Diga por que as descartadas perderam.
6. **Decisão:** em passos concretos, no presente ("O `hx` grava...").
7. **Consequências:** o que fica mais fácil, o que fica mais difícil, riscos aceitos e como saber se a decisão deu errado (sinal para reverter).
8. **Cabeçalho:** `Status` (`proposto` até Daniel aprovar; depois `aceito`), `Data` (AAAA-MM-DD) e `Harness` (versão de `hx version`).
9. **Diagrama (opcional):** se a decisão envolve fluxo, componentes ou estados, gere um diagrama com a skill `archify` e referencie o arquivo gerado no ADR.
10. Mostre a Daniel um resumo de 3 linhas e peça o ok. Só então marque `aceito`.

## Substituir uma decisão

Não edite o ADR antigo além do status. Crie um ADR novo, cite o número do antigo em "Contexto" e mude o antigo para `substituído por NNNN`.

## Estilo

Português do Brasil, frases curtas, sem jargão desnecessário. Um ADR cabe em uma tela e meia.

## Antes de terminar

- [ ] Número sequencial, sem buraco nem repetição.
- [ ] Toda afirmação de "documentação" tem fonte.
- [ ] Pelo menos duas alternativas.
- [ ] Status e data preenchidos.
- [ ] Linha nova no `index.md` fica por conta do hook (não edite o `index.md`).
