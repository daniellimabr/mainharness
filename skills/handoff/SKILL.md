---
name: handoff
description: "Escreve um handoff curto (máx. ~40 linhas): objetivo, estado atual, arquivos que pode tocar, decisões, critério de pronto e próximos passos. Use ao delegar trabalho a um clone ou subagente, e SEMPRE que o contexto chegar perto do limite (alerta de 120K, 'escreva o handoff', antes de compactar ou trocar de chat). Grava com 'hx handoff' via heredoc."
argument-hint: "[delegar | contexto]"
---

# Handoff

Um handoff é um bilhete para quem continua o trabalho sem ter visto nada do que você viu. Curto, concreto, sem enrolação. **No máximo ~40 linhas.**

## Dois usos

- **Delegar** a um clone/subagente (`main-harness:executor`): ele começa do zero e só sabe o que está no bilhete.
- **Limite de contexto:** você mesmo, depois da compactação ou num chat novo. O `hx` reinjeta o handoff (ADR 0006).

## Formato

```
# Handoff — <sprint> / <tarefa ou assunto>

## Objetivo
Uma ou duas frases: o que precisa existir no fim e por quê.

## Estado atual
- O que já está feito (com nomes de arquivos).
- O que está em andamento ou quebrado agora.

## Arquivos que pode tocar
- `caminho/arquivo-a`
- `caminho/arquivo-b`
(Todo o resto: não toque. Precisa de outro? Avise o Tech Lead.)
Ler, buscar e editar só com Read, Grep, Glob, Edit e Write. Terminal no Windows pelo PowerShell (`hx run ...`), sem `cd`; no Bash, sem `cd` e sem `/c/...`.

## Decisões já tomadas
- Decisão e motivo em uma linha (ADR NNNN, se houver).

## Critério de pronto
- Teste/comando que prova: lint e tipos zerados (ex.: `hx run npm run check` e `hx run npx tsc --noEmit -p cli`, ou o `tsc` do projeto; lint sozinho não pega erro de tipo).

## Próximos passos
1. Passo concreto e pequeno.
2. ...
```

## Regras de ouro

1. **Só o necessário.** Sem histórico da conversa, sem colar código, sem log. Aponte arquivo e linha.
2. **Verificável.** O critério de pronto é um comando ou teste, não "ficar bom".
3. **Fronteira clara.** A lista de arquivos evita dois agentes no mesmo arquivo.
4. **Estado honesto.** Diga o que não funciona e o que você não testou.
5. **Próximo passo imediato.** O primeiro item deve poder ser feito sem perguntar nada.
6. **Nada de segredos** (chaves, tokens, senhas, dados de cliente).
7. Português do Brasil, frases curtas.

## Gravar (limite de contexto)

Use heredoc com aspas simples, assim o shell não mexe no texto:

```
hx handoff <<'EOF'
# Handoff — S01 / T04
...
EOF
```

Veja o último com `hx handoff --show`. Também aceita `hx handoff --file <arquivo>`.

## Delegar a um clone

1. Escreva o handoff (mesmo formato) e passe o texto no prompt do subagente `main-harness:executor`.
2. Peça um relatório curto de volta: o que fez, comandos rodados, resultado.
3. Confira o resultado antes de marcar a tarefa (`hx task done <id>`).

## Antes de enviar

- [ ] Menos de ~40 linhas.
- [ ] Alguém sem contexto entende o objetivo em 10 segundos.
- [ ] Arquivos permitidos listados.
- [ ] Critério de pronto executável.
