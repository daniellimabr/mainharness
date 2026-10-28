# ADR 0013 — Um modelo fixo por papel

- **Status:** aceito
- **Data:** 2026-10-27
- **Harness:** 0.9.0 (entra na 0.10.0)

## Contexto

Na S10, o chat principal em Opus custou US$ 11,27 de US$ 26,99 e leu 44 milhões de tokens de cache: o contexto grande do orquestrador é relido a cada turno. Os evals foram 34% do custo, quase tudo em rodadas repetidas. Mandar a execução a um modelo barato economiza pouco se quem orquestra segue em Opus com contexto enorme.

A S10 também trouxe o gatilho de 90%: perto do limite de uso, o harness mandava as tarefas ao trabalhador Gemini (ADR 0012). Na prática, a escolha de modelo virou uma reação ao % de uso, e não uma decisão do plano.

## O que a documentação diz

- O `model:` no frontmatter de um agente vale para o subagente e para a sessão aberta com ele; o seletor de modelo do chat manda na sessão principal; o `model:` de um comando só vale no turno do comando.
- Trocar o modelo no meio do chat relê o contexto inteiro sem cache (custo de escrita de cache de novo).

## Alternativas

1. **Tudo em Opus, Gemini só perto do limite (S10).** Qualidade alta, custo alto; o gatilho decide tarde demais.
2. **Tudo em Sonnet.** Mais barato, mas o plano e a revisão de segurança perdem qualidade, e erro de plano custa caro depois.
3. **Um modelo fixo por papel, quem executa escolhido no plano por regra escrita.** (escolhida)

## Decisão

| Papel | Modelo | Onde |
|---|---|---|
| Planejar (sprint plan, ADR, PRD) | **Opus** | chat de planejamento; padrão do agente `tech-lead` |
| Orquestrar a execução (`sprint-run`) | **Sonnet** | chat novo, Sonnet escolhido por Daniel no seletor |
| Executar uma tarefa | **pela regra abaixo** | coluna Agente do plano |
| Revisar (Reviewer) | **Opus** | `model: opus` ao chamar |

**Quem executa** (decidido pelo Tech Lead no plano e aprovado por Daniel junto com ele):

- **Opus**, se vale ao menos uma: decisão de desenho que o plano não fechou; muda contrato usado por outros projetos (eventos, config, comandos do `hx`); lógica nova em área sensível (hooks, `pre-bash`, release, processo com senha); o Sonnet já falhou 2 vezes na tarefa.
- **Gemini** (trabalhador, ADR 0012): escopo fechado, até 3 arquivos, nada sensível, handoff com o teste de aceite.
- **Sonnet:** todo o resto.

**Sem troca por limiar:** o modelo de cada papel não muda com o % de uso. Perto do limite, o Tech Lead grava o handoff e para. O gatilho de 90% (aviso no `Stop` e no `hx task`, `worker.threshold`) sai.

## Consequências

- O chat de execução em Sonnet relê contexto a preço de Sonnet; o Opus fica no plano e na revisão, onde erro custa mais.
- O harness grava modelo e tokens por modelo no `sprint.metrics` (S11/T05) para medir. A S12 é a primeira sprint inteira no modelo novo e compara com a S10 e a S11.
- O padrão do chat é Opus (decisão de Daniel no teste da S11). Daniel escolhe Sonnet no seletor ao abrir o chat do `sprint-run`, que para na primeira resposta, sem rodar nada, se não estiver em Sonnet (sem trocar sozinho). Um bloqueio por hook, antes de gastar token, não é confiável: o chat do VS Code abre sem informar o modelo ao `SessionStart`.
- Se a regra errar muito (retrabalho em tarefas de Gemini ou Sonnet), revemos a regra, não voltamos ao gatilho.
