# S15 — Notas do juiz cego

Critérios 0–5: Correção (Co), Testes escondidos (Es), Tamanho e clareza/Ponytail (Ta), Lint e tipos (Li), Segurança (Se). Soma 0–25.

Aviso sobre "aceite 0/N": nos 3 diffs com esse resultado (D1-B, D2-C, e o D3-A tem 10/1, que é outro caso) o teste de aceite dentro do diff é idêntico ao do handoff e ao dos diffs que passaram, e os escondidos passaram todos. Pelo código, os testes deveriam passar. Os diffs com 0/N também são os únicos com ruído de `.claude/harness.json` (versão 0.12.0), então o 0/N parece falha de ambiente da execução, não do código. Pesei só levemente em Correção (-1 a -2).

## Desafio 1 (lock antes do spawn)

| Letra | Co | Es | Ta | Li | Se | Soma |
|---|---|---|---|---|---|---|
| A | 3 | 3 | 4 | 5 | 5 | 20 |
| B | 3 | 5 | 4 | 5 | 5 | 22 |
| C | 5 | 5 | 4 | 5 | 5 | 24 |

- A Co: lock atômico com `wx`, mas `readLock` não trata JSON `null` (quebra com TypeError) e exceção do spawn é relançada em vez de sair com 1. Es: 1 escondido falhou, consistente com isso. Ta: helper enxuto, só os 2 testes do handoff. Li/Se: ok.
- B Co: grava o lock antes do `await` e limpa nas desistências, mas usa checagem + escrita (sem `wx`, janela mínima entre processos distintos) e não trata lock `null`; o aceite 0/6 não se explica pelo código. Es: 7/0. Ta: o menor diff. Li/Se: ok.
- C Co: `wx` atômico, repete uma vez após remover lock velho, trata `null`, exceção do spawn vira saída 1 sem lock; cobre todas as regras. Es: 7/0. Ta: helper mais um pouco de código, mas com 4 testes (cobre limpeza e lock inválido). Li/Se: ok.

## Desafio 2 (trabalhador morto sem relatório)

| Letra | Co | Es | Ta | Li | Se | Soma |
|---|---|---|---|---|---|---|
| A | 5 | 5 | 4 | 5 | 5 | 24 |
| B | 5 | 5 | 5 | 5 | 4 | 24 |
| C | 4 | 5 | 4 | 5 | 4 | 22 |

- A Co: todas as regras (pid numérico, mtime do relatório vs lock, uma vez só, lock inválido ignorado), chamado em `status` e `run`. Ta: um pouco mais longo por validar com regex. Se: valida `sprint`/`task` antes de montar o caminho do arquivo.
- B Co: mesmas regras, sem validar formato. Ta: o mais enxuto. Se: `sprint`/`task` do lock entram direto no caminho (baixo risco, o lock é escrito pelo próprio hx).
- C Co: regras ok, mas chama a função no início de `start`, antes da validação dos argumentos (roda até em erro de uso); aceite 0/9 parece de ambiente. Ta: `existsSync`+`statSync` duplicado, ok. Se: igual a B.

## Desafio 3 (`hx worker list`)

| Letra | Co | Es | Ta | Li | Se | Soma |
|---|---|---|---|---|---|---|
| A | 3 | 5 | 4 | 5 | 5 | 22 |
| B | 4 | 3 | 3 | 5 | 5 | 20 |
| C | 4 | 5 | 4 | 5 | 5 | 23 |

- A Co: `workers` ausente cai no ramo "inválido" (`undefined` não é objeto) e sai com 1, em vez de "Nenhum trabalhador configurado." e 0; coerente com 1 teste próprio falhando (aceite 10/1). Resto correto. Es: 8/0. Ta: duas checagens repetidas para "mal configurado", `priceLabel` separado.
- B Co: cobre a especificação, mas acrescenta regras não pedidas (preço não numérico vira "mal configurado"); Es: 2 escondidos falharam, provável efeito dessas extras ou da troca do token por `***` via `split` (que corrompe a linha se o token for substring do modelo/URL). Ta: mascaramento do token é código desnecessário (o token nem é impresso).
- C Co: `new URL` normaliza a saída (some porta padrão, `/` final, hash), pequeno desvio do "mostra a url sem credenciais"; "mal configurado" também para URL inválida. Es: 8/0. Ta: compacto, 3 testes.

Todos: tsc, eslint e prettier ok; nenhum vaza o token.
