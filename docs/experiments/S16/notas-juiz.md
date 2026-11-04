# Notas do juiz cego (Reviewer Sonnet, 0–25)

Mapa letra→corrida aberto só depois das notas (`mapa-juiz.json`). Uma corrida por caso: indica, não prova.

| Desafio | atual | leve | sem-dashboard |
|---|---|---|---|
| 1 | B 23 | E 20 | A 20 |
| 2 | D 24 | I 25 | G 23 |
| 3 | C 23 | H 25 | F 24 |
| **Média** | **23,3** | **23,3** | **22,3** |

Tokens totais das 3 corridas (entrada+saída+cache): atual 1.453.467 · leve 859.531 (−41%) · sem-dashboard 1.697.421.
Custo: atual US$ 0,672 · leve 0,524 (−22%) · sem-dashboard 0,712. Tempo: 328 s · 216 s · 348 s.
Abertura da sessão (por sessão): atual ≈44k tokens, leve ≈38k (−15%).

Observações do juiz: lint/tipos 5/5 em todas; testes escondidos: E e A falharam 1 de 7 (desafio 1), o resto passou tudo; a maioria (menos E, I, H) mexeu em `.claude/harness.json` (fora do escopo), o que custou 1 ponto de clareza. Segurança julgada só pelo código de produção.
