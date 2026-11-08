# ADR 0018 — Limite de clones em paralelo, por máquina

- **Status:** aceito
- **Data:** 2026-11-07
- **Harness:** 0.15.0

## Contexto

Na S17, uma onda rodou 7 clones ao mesmo tempo. No notebook-corp de Daniel a CPU foi a 83% e a memória a 85%, e o PC ficou quase inutilizável. O limite que cabe numa máquina depende do hardware e do antivírus, então não é uma regra do harness inteiro.

## O que a documentação diz

- Captura de tela do Gerenciador de Tarefas (Daniel, 2026-11-07, S17 em curso): System 21% de CPU, vários "Node.js JavaScript Runtime" ativos, VS Code 1,5 GB, memória 85%.
- O CrowdStrike Falcon roda como filtro de kernel e a CPU dele costuma aparecer como "System": hipótese, não medida. Confirmação prevista: o System cair para 2–3% quando a onda acabar.
- O CLAUDE.md do repo e o sistema do Tech Lead não fixam máximo de clones por onda (verificado em 2026-11-07).

## Alternativas avaliadas

1. **Sem limite (hoje):** sprint mais rápida, mas trava o PC de quem trabalha ao lado. Descartada no notebook-corp.
2. **Limite fixo no harness (ex.: 4 para todos):** simples, mas pune máquinas fortes sem necessidade.
3. **Limite por máquina, 4 no notebook-corp (escolhida):** respeita o hardware; custa lembrar de revisar ao trocar de computador.

## Decisão

- No **notebook-corp**, o Tech Lead roda no máximo **4 clones em paralelo** por onda; o excedente espera um clone terminar. O Reviewer não entra na conta.
- O plano pode ter ondas maiores; quem limita é a execução, não o plano.
- O limite é da máquina, não do harness. **Em outro computador, Daniel decide de novo.**
- Lembrete: ao subir o harness em outra máquina, o Tech Lead pergunta a Daniel o limite antes da primeira onda. O backlog B150 guarda o pedido de virar configuração do `hx`.
- Vale a partir da próxima onda; a onda em curso da S17 termina como está (parar clone no meio pode estragar a tarefa).

## Consequências

- O PC fica utilizável durante a sprint; a sprint pode demorar um pouco mais.
- Sinal para reverter: a CPU continuar alta com 4 clones (a causa seria o antivírus ou o disco, não o paralelismo) ou o tempo de sprint subir sem ganho de conforto.
- Risco aceito: depender de lembrete humano até o B150 existir.
