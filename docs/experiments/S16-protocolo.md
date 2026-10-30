# S16 — Protocolo: harness leve × atual e custo do Dashboard

Perguntas: (1) um perfil leve entrega a mesma qualidade gastando menos tokens e tempo? (2) quanto custa ao harness a comunicação com o Dashboard? Mesmo método da S12/S14/S15 (`S15-protocolo.md`): mesmas condições, mesmo handoff, testes escondidos, nota 0–25, juiz cego.

## Condições
- Modelo: **Sonnet** nas 9 corridas e na abertura. Persona `main-harness:executor` (no perfil leve, a versão enxuta), ferramentas `Read,Edit,Write,Glob,Grep,Bash,PowerShell`, clone temporário limpo com `npm ci`, `HARNESS_HOME` temporário, limite de 60 min, **uma corrida por vez**.
- Desafios 1, 2 e 3 do `scripts/bench.mjs`, com as bases abaixo (as mesmas da S15).
- Corrida com falha do ambiente (rede, 429 em massa, queda de máquina) é refeita e não entra.
- Uma corrida por caso: indica, não prova.

| Desafio | Base |
|---|---|
| 1 | `af8b9996f9750f50ced5e4ecb045cc5a7d9e6e68` |
| 2 | `bd59ba1b0deb082701fb54652c959d7281d8e127` |
| 3 | `ebf31dc685c90246a0b5ad88bc08a74fe00943a6` |

## Perfis
| Perfil | O que é |
|---|---|
| **A atual** | Harness e plugins companheiros como Daniel usa hoje; `CLAUDE.md` e `executor` atuais; hooks de `hooks/hooks.json` inteiros. |
| **B leve** | Só o plugin do harness, com `hooks.json` reduzido a `pre-bash`, `pre-edit`, `post-edit` e `session-start`; **sem** plugins companheiros (ponytail, remember, claude-code-setup, security-guidance); `CLAUDE.md` e `executor` enxutos; só as skills que a tarefa usa (`tdd-workflow`, `handoff`). |
| **C atual sem Dashboard** | Perfil A com `HARNESS_DASHBOARD=off` (T06). Isola o custo da comunicação com o Dashboard do resto do peso do harness. |

### Definição do perfil leve (arquivos em `scripts/perfil-leve/`, T09)
- `hooks.json`: 4 hooks acima; fora `prompt`, `subagent-start`, `Stop`, `notification` e qualquer outro de observação.
- `CLAUDE.md` leve: idioma, estilo Ponytail em 2 linhas, regra de lint zero, nada de processo de sprint (a corrida é uma tarefa só).
- `executor.md` leve: objetivo, só os arquivos do handoff, TDD, não commitar, relatório de 5 linhas.
- O mecanismo exato (flags de `claude -p` para trocar plugins/settings/plugin-dir) é decidido na T09 e registrado no cabeçalho de `bench.mjs`; deve valer igual para os três perfis, mudando só o perfil.

## Medidas por corrida
Nota 0–25 do juiz cego (correção, escondidos, tamanho/clareza, lint/tipos, segurança), tempo, tokens (entrada, saída, cache), US$ (`cost_usd`), chamadas de ferramenta (`turns`), e o **custo de abertura**: `claude -p "ok"` 3 vezes por perfil, tokens de entrada antes do primeiro trabalho (mediana).

## Juiz
Reviewer Sonnet, às cegas: recebe os diffs das 9 corridas em letras sorteadas (sem perfil, sem tempo, sem custo) e dá a nota. A tabela letra→perfil é gravada antes e só aberta depois das notas.

## Overhead do Dashboard (T07/T10)
`scripts/overhead.mjs` mede ms por hook (N=20, ligado e desligado), chamadas por sprint (eventos S13–S15), segundos e tokens injetados por sprint, crescimento do disco dos eventos e o ruído das linhas `error`. Resultado em `S16-overhead.md`.

## Leitura
- **Leve vale** se ficar a até 2 pontos do atual na média e poupar tokens e tempo de forma visível (≥ 20% de tokens de abertura ou de total) sem falhar a segurança.
- **Dashboard vale desligar/enxugar** se o custo por sprint (segundos + tokens) passar de ~2% do total da sprint, ou se hooks de observação injetarem contexto sem uso.
- Nada muda no padrão sem Daniel aprovar (ADR 0017 na T11).
