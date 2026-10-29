# S12 — Desafio 2 (B105): notas cegas

Mapa revelado depois das duas notas: **B = Opus**, **A = Sonnet**, **C = Gemini**.

| Diff (modelo) | Opus: corr/ocultos/Ponytail/lint/seg = soma | Sonnet: corr/ocultos/Ponytail/lint/seg = soma |
|---|---|---|
| B (Opus) | 5/5/5/5/5 = **25** | 5/5/4/5/5 = **24** |
| A (Sonnet) | 5/5/5/5/3 = **23** | 5/5/5/5/3 = **23** |
| C (Gemini) | 2/5/2/5/1 = **15** | 3/5/1/2/1 = **12** |

Vencedor (nota do Reviewer Opus): B (Opus), aplicado na main. Os dois Reviewers concordaram no ranking B > A > C.
Diferença entre B e A: B valida o formato de sprint e tarefa lidas do lock (S\d+/T\d+) antes de montar o caminho; A deixa passar ../.
Observações sobre o Gemini (C): 103 chamadas e 35 min; não colou o teste de aceite (8 em vez de 9 testes); pôs BOM em worker.ts e no teste e corrompeu acentos (FaÃ§a); apagou asserções que protegem o token (ADR 0012); alterou docs/sprints/S01-release.md, arquivo fora do escopo. Lint e prettier não pegam BOM nem mojibake.
Custo do Gemini no JSON (US$ 9,68) é conta do claude -p com preço de modelo Claude, não o valor cobrado pelo OmniRoute.
