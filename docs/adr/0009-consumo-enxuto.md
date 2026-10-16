# ADR 0009 — Consumo enxuto: evals no Sonnet, Reviewer no Sonnet e sem Writer

- **Status:** aceito
- **Data:** 2026-10-16

## Contexto

A S00 estourou o limite de uso 3 vezes (US$ 42 medidos, fora os evals, que não entravam na conta). As causas foram os evals das skills (10 skills × 16 consultas × 2 rodadas = 320 sessões `claude -p` no Opus, mais os casos) e o Reviewer no Opus: ~73% do custo do Reviewer foi rodar evals (T15). Os scripts de eval não foram versionados, e o `run_eval.py` do skill-creator não roda no Windows.

## O que a documentação diz

- `claude -p --output-format stream-json --verbose` traz as chamadas de ferramenta (é assim que se vê se a ferramenta Skill foi usada) e, na última linha, `usage` (tokens) e `total_cost_usd`, o que permite contar o custo de cada sessão de eval. O formato `json` simples não mostra as chamadas.
- `--setting-sources project` faz a sessão ler só as configurações do sandbox, sem plugins nem permissões do usuário.
- Agentes de plugin aceitam `model` no frontmatter; quem chama o agente pode passar outro modelo na chamada.
- Ler cache custa por token do modelo; abrir um agente grava ~30 mil tokens de contexto, qualquer que seja o modelo.

## Alternativas avaliadas

1. **Manter tudo no Opus e só reduzir rodadas:** qualidade máxima, mas o Reviewer e os evals continuam caros.
2. **Haiku nos evals e no Reviewer:** mais barato, mas Daniel recusou (perda de qualidade).
3. **Sonnet nos evals e no Reviewer de rotina, Opus só onde a segurança pede:** corta a maior parte do custo sem perder qualidade relevante.

## Decisão

Alternativa 3, em passos:

- **Evals (`hx eval`):** Sonnet, 1 rodada por consulta, paralelismo máximo 3, cada sessão em sandbox temporário. Escopo pelo que mudou desde a última tag: descrição (frontmatter) mudou → só `trigger.json`; corpo mudou → só `evals.json`; mudança só em `evals/` não dispara eval; skill nova roda tudo, com baseline sem skill. `trigger.json` com 8 consultas (4 acionam, 4 não).
- **Acionamento:** cada consulta roda com `--max-turns 2` (a skill acionada não executa a tarefa inteira). Passa com até 1 erro em 8, porque cada consulta roda uma vez só e a resposta varia (na S00, 15/16 já era aceito).
- **Casos:** rodam com `--permission-mode acceptEdits`, dentro do sandbox. Uma sessão juiz extra (Sonnet, 1 turno) avalia todos os casos da skill contra as expectativas e devolve JSON; todos precisam passar. Detalhe em `evals/cases-results.json`.
- **Consumo visível:** o `hx eval` emite eventos `usage` com tokens e US$ do JSON de saída, e o `hx usage` passa a contar as sessões de eval.
- **Reviewer:** `model: sonnet` na rotina. O Tech Lead chama com `model: opus` quando a tarefa toca superfície de segurança (hooks, pre-bash, attach, release, entrada externa).
- **Limite de reprovação:** no máximo 2 por tarefa. Na 3ª, o Reviewer para e escala ao Tech Lead, que decide (com Daniel, se preciso).
- **Revisão enxuta:** uma revisão por onda (o `hx review` continua por tarefa); a re-revisão continua o mesmo Reviewer (SendMessage); o Reviewer não repete lint, tipos e testes que o Tech Lead já rodou com `hx run`: confere o resultado e foca em segurança, Ponytail e critérios de aceite.
- **pre-bash:** protege contra acidentes da IA, não contra ataque deliberado (o Claude Code tem as próprias permissões). Reprovação só quando um comando destrutivo comum passa. Na S00, caçar desvios gerou 3 reprovações.
- **Sem Writer:** o Tech Lead escreve plano, ADR, PRD, Release Report e diagramas. Delegar a um modelo mais barato não compensa (o contexto do agente novo custa mais que a escrita). Para ganhar tempo, o Tech Lead se copia.
- **Plugins companheiros:** main-harness, ponytail e security-guidance ficam na lista `PLUGINS` (`cli/src/attach/setup.ts`); o `hx release` atualiza todos em cada projeto e o `hx doctor` avisa versão faltando ou desatualizada.

## Consequências

- Evals de 1 skill alterada custam no máximo 8 sessões Sonnet de acionamento ou 3 de casos mais 1 de juiz, e aparecem no `hx usage`.
- Qualquer arquivo da skill fora de `evals/` conta como corpo (inclui `SOURCE.md`): mudar só texto de origem também exige os casos.
- O gate de release aceita o resultado conforme o que mudou.
- Revisões de rotina ficam mais baratas; tarefas de segurança continuam com Opus.
- Sem Writer, o Tech Lead gasta mais do próprio contexto com documentos; o handoff aos 250K (ADR 0006) cobre isso.
- Todos os projetos ficam com os mesmos plugins e versões do harness.
