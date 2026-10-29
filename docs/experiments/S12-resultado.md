# S12 — Resultado do experimento: Opus × Sonnet × Gemini

Protocolo em `docs/experiments/S12-protocolo.md`. Dados brutos em `docs/experiments/S12/` (um `.json` e um `.patch` por corrida, notas cegas em `d1-notas.md` e `d2-notas.md`).

## 1. Resumo e proposta

**O que aconteceu:**

- **Opus venceu os dois desafios** (notas 24 e 25 de 25), em cerca de 3 min e menos de US$ 1 por corrida. As duas entregas foram para a `main` sem ajuste.
- **Sonnet foi o mais rápido e o mais barato** (menos da metade do custo do Opus), com nota boa (21 e 23), mas errou nos dois um caso de borda: no desafio 1, saía com erro em vez de código 1 quando o processo filho falha; no desafio 2, não validava o nome da sprint lido do arquivo antes de montar o caminho (dava para escrever fora da pasta). Nenhuma das duas entregas iria para a `main` sem uma rodada de correção.
- **Gemini não serviu para código:** estourou os 60 min no desafio 1 e levou 35 min e 103 chamadas no desafio 2. Mexeu em arquivos fora do escopo, deixou log de depuração, estragou acentos (BOM e `FaÃ§a`) e apagou testes que protegem o token (ADR 0012). Lint e prettier não pegam BOM nem acento estragado.
- **Os dois Reviewers (Opus e Sonnet) deram o mesmo ranking** nos dois desafios e acharam os mesmos problemas. O Sonnet custou metade.

**Proposta de ajuste da regra "quem executa" (ADR 0013).** É uma **proposta**: só vira ADR se Daniel aprovar.

| Hoje (ADR 0013) | Proposta |
|---|---|
| **Opus** se: decisão de desenho aberta; muda contrato do `hx`; área sensível; Sonnet falhou 2 vezes | Igual, e mais um caso: **código com caminho de erro ou que usa dado lido de arquivo ou do usuário** (código de saída, lock, caminho montado a partir de JSON). Foi exatamente onde o Sonnet errou nos dois desafios. |
| **Gemini:** escopo fechado, até 3 arquivos, nada sensível | **Gemini fora da execução de código.** Só texto (docs), e só se o Reviewer conferir escopo e codificação (BOM, acentos). Volta a ser opção se um novo teste, com o problema de codificação resolvido, mostrar outro resultado. |
| **Sonnet:** todo o resto | Igual: docs, troca de texto já decidida, regra simples com teste claro (como T08 e T10 da S12). |

Conta que sustenta a troca: uma corrida de Opus custa cerca de US$ 0,40 a mais que a do Sonnet. Uma revisão a mais (Reviewer Opus, US$ 0,43 a 0,45) mais a correção já passam disso. Quando a tarefa tem caso de borda, pagar o Opus de saída sai mais barato que corrigir depois.

## 2. Resultado por desafio e modelo

- **Desafio 1 (B099), pequeno:** gravar o lock do `hx worker run` antes de iniciar o processo.
- **Desafio 2 (B105), médio:** trabalhador que morre sem relatório ganha um relatório de falha, e o `hx worker status` avisa.

### Qualidade e tempo

| Desafio | Modelo | Nota Opus | Nota Sonnet | Testes ocultos | Tempo | Chamadas | Aprovada? |
|---|---|---|---|---|---|---|---|
| 1 | Opus | **24** | 24 | 7/7 | 3,5 min | 18 | sim (foi para a `main`) |
| 1 | Sonnet | 21 | 21 | 6/7 | 1,8 min | 13 | não (1 oculto falhou) |
| 1 | Gemini | 20 | 19 | 7/7 | 60 min (estourou) | — | não (fora do escopo, log de depuração, lock sem trava atômica) |
| 2 | Opus | **25** | 24 | 7/7 | 2,9 min | 16 | sim (foi para a `main`) |
| 2 | Sonnet | 23 | 23 | 7/7 | 1,4 min | 17 | não (falta validar o caminho) |
| 2 | Gemini | 15 | 12 | 7/7 | 35,6 min | 103 | não (BOM, acentos, testes do token apagados, fora do escopo) |

Nota: soma de 5 critérios de 0 a 5 (correção, ocultos, tamanho e clareza, lint e tipos, segurança). "Aprovada" = iria para a `main` sem ajuste. Lint e tipos passaram nas 6 corridas.

### Consumo

| Desafio | Modelo | Entrada | Saída | Cache lido | Cache criado | Custo | Litros | Litros/km | US$/km |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Opus | 22 | 10.775 | 565.692 | 66.292 | US$ 0,86 | 193 | 10,7 | 0,048 |
| 1 | Sonnet | 16 | 8.286 | 384.795 | 60.693 | US$ 0,36 | 156 | 12,0 | 0,028 |
| 1 | Gemini | — | — | — | — | — | — | — | — |
| 2 | Opus | 18 | 5.540 | 443.242 | 60.735 | US$ 0,69 | 148 | 9,2 | 0,043 |
| 2 | Sonnet | 18 | 5.029 | 404.309 | 54.365 | US$ 0,31 | 134 | 7,9 | 0,018 |
| 2 | Gemini | 838.901 | 85.080 | 6.071.309 | 0 | US$ 9,68\* | 1.871 | 18,2 | 0,094\* |

- **Custo:** é o custo **estimado** que o `claude -p` informa, não uma fatura.
- **\*Gemini:** o `claude -p` calcula com preço de modelo Claude. Não é o que o OmniRoute cobra. Serve só para comparar o tamanho do consumo.
- **Gemini no desafio 1:** o processo foi encerrado aos 60 min e não chegou a gravar tokens nem chamadas.
- **Litros e km** (como em [A Viagem do Token](https://claude.ai/artifact/69AGS7iXC5FMgL2LzXXkA5)): 1 mil tokens de entrada nova = 1 litro. Cache lido pesa 0,1, cache criado 1,25 e saída 5. Cada chamada é 1 km. Litros/km mede o peso que o modelo carrega; para comparar modelos, vale o US$/km e a nota.

### Custo por entrega aprovada

| Modelo | Custo das 2 corridas | Entregas aprovadas | Custo por entrega aprovada |
|---|---|---|---|
| Opus | US$ 1,55 | 2 | **US$ 0,77** |
| Sonnet | US$ 0,67 | 0 | — (precisaria de correção, não medida) |
| Gemini | — (estimativa US$ 9,68 só no d2) | 0 | — |

### Franquia (pontos da janela de 5 h e da semana)

| Desafio | Modelo | 5 h antes → depois | Semana antes → depois |
|---|---|---|---|
| 1 | Opus | 27 → 29 (+2) | 50 → 50 |
| 1 | Sonnet | 29 → 30 (+1) | 50 → 50 |
| 1 | Gemini | 31 → 33 (+2)\* | 50 → 51\* |
| 2 | Opus | 37 → 39 (+2) | 51 → 51 |
| 2 | Sonnet | 39 → 40 (+1) | 51 → 51 |
| 2 | Gemini | 40 → 42 (+2)\* | 51 → 52\* |

\*O Gemini não usa a franquia do Claude. Os pontos que subiram nas corridas dele vêm do chat principal, que continuou trabalhando na mesma janela (35 e 60 min de corrida). Esses números estão contaminados e não medem o Gemini.

## 3. Custo por papel

Contagem sem duplicatas (S12/T08). Fonte: `hx metrics S10|S11|S12` e `hx usage`. A S12 ainda está aberta (faltam T06 e T07), e as 6 corridas do experimento ficam fora (rodam fora do registro da sprint; somam US$ 2,22 de Opus e Sonnet).

| Papel | S10 | S11 | S12 (parcial) | S10–S12 | % |
|---|---|---|---|---|---|
| Chat principal (`tech-lead`) | US$ 11,27 | US$ 5,98 | US$ 3,96 | US$ 21,21 | 43% |
| Clones (`main-harness:tech-lead` e `executor`) | US$ 4,36 | US$ 1,71 | US$ 4,56 | US$ 10,63 | 21% |
| Reviewer | US$ 2,22 | US$ 1,79 | US$ 2,25 | US$ 6,26 | 13% |
| Evals | US$ 9,14 | US$ 2,30 | — | US$ 11,44 | 23% |
| **Total** | US$ 26,99 | US$ 11,77 | US$ 10,77 | **US$ 49,53** | |
| Gemini (fora do total) | US$ 0 | US$ 0 | — | — | |

**Acumulado do projeto (`hx usage`, todas as sprints): US$ 254,68.**

| Papel | Custo | % | Plano citava |
|---|---|---|---|
| Chat principal (`tech-lead`) | US$ 118,33 | 46% | 59% |
| Clones (`main-harness:tech-lead` US$ 31,27 e `executor` US$ 4,56) | US$ 35,83 | 14% | 3% |
| Reviewer | US$ 32,83 | 13% | 13% |
| Evals | US$ 60,21 | 24% | 25% |
| Outros (`general-purpose`, `writer`, `claude-code-guide`) | US$ 7,48 | 3% | — |

Por que os números mudaram: o `main-harness:tech-lead` é o **clone** (subagente que o Tech Lead copia, ADR 0009), não o chat. Chat + clones dá cerca de 60%, o número da avaliação de 28/10. Separados, o chat principal fica em 46% e os clones em 14%. Reviewer e evals batem.

O que se vê nas três sprints: o chat principal caiu de US$ 11,27 (S10) para US$ 3,96 (S12), com o chat de execução em Sonnet. Os clones subiram na S12 porque três tarefas foram Opus de propósito.

## 4. Reviewer Opus × Sonnet

As duas notas cegas, nos mesmos diffs, sem um ver a do outro:

| Desafio | Diff | Opus | Sonnet |
|---|---|---|---|
| 1 | Opus | 24 | 24 |
| 1 | Sonnet | 21 | 21 |
| 1 | Gemini | 20 | 19 |
| 2 | Opus | 25 | 24 |
| 2 | Sonnet | 23 | 23 |
| 2 | Gemini | 15 | 12 |

**Problemas achados:**

| Problema | Opus achou | Sonnet achou |
|---|---|---|
| D1: processo filho com erro estoura em vez de sair com 1 (oculto que falhou) | sim | sim |
| D1: lock gravado sem trava atômica (`wx`), dois processos podem passar juntos | sim | sim |
| D1: `console.log` de depuração, arquivo fora do escopo, teste de aceite não colado | sim | sim |
| D1: lock com `null` derruba o comando (não coberto pelos ocultos) | sim | sim |
| D2: caminho montado a partir do lock sem validar (`../`) | sim | sim |
| D2: BOM, acentos estragados, testes do token apagados, arquivo fora do escopo | sim | sim |
| D2: código redundante no Gemini (`existsSync`, `mkdirSync`, flag a mais) | sim | sim |

Diferenças: só de peso, não de achado. O Sonnet tirou 1 ponto de clareza do Opus no D2 por estilo, deu 4 em segurança ao Gemini no D1 por causa do log de depuração e baixou o lint do Gemini no D2 para 2 por causa do BOM. O Opus seguiu o resultado do lint informado e descontou o BOM na clareza.

**Custo de cada revisão** (transcript de cada subagente, sem duplicatas):

| Revisão | Modelo | Chamadas | Custo |
|---|---|---|---|
| Nota cega D1 | Opus | 5 | US$ 0,45 |
| Nota cega D1 | Sonnet | 3 | US$ 0,21 |
| Nota cega D2 | Opus | 6 | US$ 0,43 |
| Nota cega D2 | Sonnet | 4 | US$ 0,21 |
| Revisão 1 da onda 1 (6 tarefas) | Opus | 21 | US$ 0,94 |

**Proposta** (também só vira regra se Daniel aprovar):

- **Sonnet** revisa as tarefas de rotina: docs, testes, troca de texto, código pequeno sem área sensível. Custa metade e, nestas duas rodadas, não deixou passar nada.
- **Opus** continua na revisão de segurança (`security-review`), no que muda contrato do `hx` ou área sensível (hooks, `pre-bash`, release, token) e na revisão final da sprint.
- Base pequena: duas rodadas, com diffs curtos. Vale repetir a comparação em diffs maiores antes de fechar.

## 5. Chat principal: linha de base para a S13

Para medir na S13 o efeito de compactar aos 140 mil. Fonte: eventos `usage` do chat principal (`agent: tech-lead`) em `~/.harness/events`, sem duplicatas. Ficaram fora as respostas que o chat deu pelo Gemini na S10 e na S11 (24 e 76), que não são Claude.

| Sprint | Modelo do chat | Respostas | Contexto médio | Contexto máximo | Custo | Custo por resposta |
|---|---|---|---|---|---|---|
| S10 | Opus | 224 | 94 mil | 143 mil | US$ 11,27 | US$ 0,050 |
| S11 | Opus | 127 | 132 mil | 197 mil | US$ 5,98 | US$ 0,047 |
| S12 (até a T06) | Sonnet | 96 | 127 mil | 209 mil | US$ 3,96 | US$ 0,041 |

- **Contexto** = tudo o que a resposta releu (entrada + cache lido + cache criado).
- O chat da S12 abriu antes da T09 (compactar aos 140 mil), por isso ainda passou dos 200 mil. A S12 vale como linha de base.
- **O que comparar na S13:** o contexto médio e o máximo (não dependem do modelo) e o custo por resposta **no mesmo modelo** (Sonnet, como na S12). A meta é contexto máximo perto de 140 mil e contexto médio abaixo de 127 mil.

## 6. Limitações

- **Uma corrida por modelo em cada desafio.** Sem repetição, não dá para saber quanto do resultado é sorte. Se a regra nova depender de diferenças pequenas, repetir.
- **Custo do Gemini:** o valor do JSON usa preço de modelo Claude, não o que o OmniRoute cobra. No desafio 1, o Gemini estourou os 60 min e não gravou tokens.
- **Franquia:** só mostra pontos inteiros, então +1 e +2 têm erro grande. Nas corridas do Gemini, os pontos vêm do chat principal na mesma janela.
- **Dois desafios do mesmo arquivo** (`worker.ts`), pequenos. Tarefas maiores ou em outras áreas podem dar outro resultado.
- **Custo por papel da S12 é parcial:** a sprint ainda não fechou.
- **Reviewer:** duas rodadas, diffs curtos; o mesmo Reviewer Opus decidiu o vencedor e foi comparado.
