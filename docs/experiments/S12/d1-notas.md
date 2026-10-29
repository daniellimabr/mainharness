# S12 — Desafio 1 (B099): notas cegas

Mapa revelado depois das duas notas: **C = Opus**, **A = Sonnet**, **B = Gemini**.

| Diff (modelo) | Opus: corr/ocultos/Ponytail/lint/seg = soma | Sonnet: corr/ocultos/Ponytail/lint/seg = soma |
|---|---|---|
| C (Opus) | 5/5/4/5/5 = **24** | 5/5/4/5/5 = **24** |
| A (Sonnet) | 3/4/4/5/5 = **21** | 3/4/4/5/5 = **21** |
| B (Gemini) | 3/5/2/5/5 = **20** | 3/5/2/5/4 = **19** |

Vencedor (nota do Reviewer Opus): C (Opus), aplicado na main. Os dois Reviewers concordaram no ranking e quase nas notas (diferença só em segurança do B: 5 × 4, por um log de depuração).
Observações sobre o Gemini (B): estourou 60 min (sem tokens no JSON), mas entregou diff que passa nos ocultos; deixou console.log de depuração, criou docs/sprints/S12-release.md fora do escopo e não usou wx no lock.
