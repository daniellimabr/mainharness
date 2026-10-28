# S12 — Protocolo do experimento de modelos

Objetivo: comparar **Opus**, **Sonnet** e **Gemini** na mesma tarefa, nas mesmas condições, em qualidade, velocidade, tokens/custo, chamadas e consumo da franquia. O resultado vai para `docs/experiments/S12-resultado.md`.

## Condições iguais

- **Mesmo commit de partida** para os 3 modelos (`--base`; padrão `HEAD`). Anote o commit antes da primeira corrida e use o mesmo nas três.
- **Mesmo handoff**, texto idêntico: `docs/experiments/S12/<desafio>.md`, enviado como prompt.
- **Mesma persona** (`main-harness:executor`), **mesmas ferramentas** (`Read,Edit,Write,Glob,Grep,Bash,PowerShell`, as do `hx worker run`) e **mesmo limite de 60 min** (o processo é encerrado no limite e a corrida conta como `timed_out`).
- **Clone temporário** do repo, fora do projeto, com `npm ci` feito **antes** de ligar o relógio, e `HARNESS_HOME` temporário: a corrida não suja a sprint nem a `main`.
- **Uma corrida por vez**, sem outras sessões pesadas na máquina.
- Opus e Sonnet pela assinatura (`--model opus|sonnet`). Gemini pelo OmniRoute, com o mesmo ambiente do `hx worker run` (token só do `~/.harness/config.json`, nunca em arquivo nem na saída).

## Como rodar

```
node scripts/bench.mjs <desafio> <opus|sonnet|gemini> [--base <commit>]
```

Exemplo: `node scripts/bench.mjs desafio-1 opus --base f805292`. Grava em `docs/experiments/S12/`:

- `<desafio>-<modelo>.json`: duração (s), turnos, tokens (entrada, saída, cache lido, cache criado), custo estimado (US$, do `claude -p`), código de saída, se estourou o tempo, nº de erros 429, % da franquia antes/depois (5 h e semana; `null` quando indisponível), linhas do diff, lint (`typecheck`, `eslint`, `format`), testes de aceite e testes ocultos (`ok`, passaram, falharam).
- `<desafio>-<modelo>.patch`: o diff da entrega (sem `cli/dist`).

## Testes de aceite e ocultos

- **Aceite:** vai no handoff; o modelo o escreve e faz passar. O bench roda `cli/test/worker-run.test.ts` (o comando do handoff) depois do `npm run build`.
- **Ocultos:** casos de borda que o modelo não vê. Ficam em `docs/experiments/S12/hidden/<desafio>/`, com o **mesmo caminho relativo** que terão no repo (ex.: `hidden/desafio-1/cli/test/d1-hidden.test.ts`). O bench os copia para o clone só depois de gravar o diff e roda só esses arquivos.
- Os ocultos precisam **falhar no commit de partida**.

## Avaliação cega

1. Para cada desafio, o Tech Lead sorteia as letras **A, B e C** para os 3 `.patch` e guarda o mapa (letra → modelo) sem mostrar a ninguém.
2. O **Reviewer Opus** recebe os 3 diffs só pelas letras, junto com os resultados de lint e testes (sem nome de modelo, custo, tempo ou tokens), e dá nota de **0 a 5** em cada critério:

| Critério | 0 | 5 |
|---|---|---|
| Correção | não resolve o pedido | resolve tudo o que o handoff pede |
| Testes ocultos | nenhum passa | todos passam |
| Tamanho e clareza (Ponytail) | inchado, abstração à toa | o mínimo que resolve, fácil de ler |
| Lint e tipos | erros ou avisos | zero erros e zero avisos |
| Segurança | vaza segredo ou abre brecha | nada a apontar |

3. Nota final do diff = soma dos 5 critérios (0 a 25).
4. O **Reviewer Sonnet** faz a mesma avaliação, em paralelo, sem ver a nota do Opus. A nota dele não decide; serve para comparar as duas revisões e o custo de cada uma.
5. Só depois das duas notas o mapa A/B/C é revelado.

## Vencedor

- O diff com a **maior nota do Reviewer Opus** vai para a `main`.
- **Empate:** vence o **mais barato** (`cost_usd` do JSON).
- Medimos a primeira entrega: não há rodada de correção depois da nota.
