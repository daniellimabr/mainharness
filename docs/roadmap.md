# Roadmap do Main Harness

Ordem de prioridade. O que vira trabalho entra em `docs/backlog.md` e depois em um sprint plan aprovado por Daniel.

## 1. Auditoria com `claude-code-setup` (logo após a v0.1.0)

Rodar o plugin oficial `claude-code-setup` (`claude-code-setup@claude-plugins-official`) no repo do Main Harness como auditoria.

- Ele só **lê e recomenda** (MCP, skills, hooks, subagentes, comandos).
- Cada recomendação ligada a evidência no repo vira item de backlog (origem: roadmap).
- **Nada é aplicado automaticamente.** Daniel decide o que entra em sprint.
- Item de backlog: B002.

## 2. Notificações para Daniel no Windows

Avisar quando:

- um plano está esperando aprovação;
- uma sprint terminou;
- o contexto bateu o alerta de 250K;
- o "chat novo + Enter" se um dia voltarmos a ele (ADR 0006, B001).

Não precisa ser cedo.

## 3. Continuidade quando a cota de uso acabar

- Detectar o limite (ou estimar pelo consumo) e escrever o handoff antes de parar.
- Mostrar no Dashboard a previsão de quando a cota vai acabar.
- Pesquisar se o Claude Code expõe esse percentual.
- Usar **só caminhos oficiais da Anthropic**. Exceção aceita: o % de uso vem do endpoint interno do `/usage` (ADR 0010, S07).

## 4. Backup remoto e marketplace no GitHub

Repositórios privados primeiro; depois o marketplace servido de lá (hoje é local, ADR 0001). Daniel ativa quando quiser.

## 5. Mapa do repo em escala

Quando o `index.md` ficar grande demais para o contexto, avaliar uma solução como o Graphify.

## 6. Isolamento entre subagentes

Se colisões em arquivos virarem rotina (os indicadores da sprint mostram), avaliar git worktrees com regras rígidas. Item de backlog: B003.

## 7. Telemetria oficial (OpenTelemetry)

Quando o Dashboard for para a nuvem. O adaptador de consumo do ADR 0007 já prevê a troca: nova implementação de `UsageSource`, mesmo evento `usage`.

## 8. Trabalhadores no Gemini (feito na S10, v0.9.0; removido na S13, v0.11.0)

O Tech Lead passou tarefas simples a trabalhadores `claude -p` no Gemini, pelo OmniRoute local (ADR 0012 e ADR 0013, guia em `docs/omniroute.md`). O experimento da S12 mostrou o Gemini lento e com falhas que lint e testes não pegam; o ADR 0014 o desligou e a S13 removeu `hx worker`, a skill e a config. Haiku assume o texto simples.

## 9. Um modelo fixo por papel (feito na S11, v0.10.0)

Opus planeja e revisa, Sonnet orquestra a execução, e quem executa cada tarefa (Gemini, Sonnet ou Opus) sai de uma regra escrita no plano (ADR 0013). O gatilho de 90% saiu. Clones e trabalhadores usam a persona enxuta `executor`. O `sprint.metrics` traz custo e tokens por modelo, e o alerta de contexto passou para 120 mil. Próximo passo: a S12 é a primeira sprint inteira no modelo novo e compara o custo com a S10 e a S11.

## 10. Experimento Opus × Sonnet × Gemini (feito na S12, v0.10.2)

A mesma tarefa em 3 modelos, com nota cega de dois Reviewers. Opus venceu os dois desafios; o Gemini ficou lento e entregou falhas que lint e testes não pegam. Daniel aprovou a proposta de `docs/experiments/S12-resultado.md`: o ADR 0014 põe Haiku no lugar do Gemini (desligado) e o Reviewer em Sonnet na rotina e Opus em área sensível e na revisão final. A sprint também tirou duplicatas do `hx usage`/`hx metrics` e passou a compactar aos 140 mil em todos os projetos. Próximo passo: medir o efeito dos 140 mil contra a linha de base.

## 11. Harness mais enxuto e mais observável (feito na S13, v0.11.0)

Gemini e `hx worker` saíram (ADR 0014). `hx task drop|defer` tira ou adia tarefa e pede nova aprovação; `done`/`phase` em tarefa feita só avisa; `index.md` perde linhas de arquivos apagados. O `usage` não duplica e leva a tarefa, então `hx metrics` mostra custo por tarefa e por executor. Novos eventos para o Dashboard: TNN no `agent.start`, `agent_id` no `alert.context`, `context` a cada `Stop`, `attention` e `error`. Regra de ouro, perfil de decisão (`docs/decisoes-daniel.md`) e handoff melhor após compactar. Próximos passos: aviso no Windows (B109), medir Haiku como executor de texto (B116), `hx shot` (B123).

## 12. Externos grátis testados e custo por tarefa (feito na S14, v0.12.0)

`hx worker` genérico (apelidos em `workers` na config), trava de codificação no `post-edit`, custo por tarefa com rateio do chat, guia `docs/omniroute.md`. O teste cego não mediu DeepSeek, Kimi e GLM: a rota `cfp/` limita o pedido a 6.000 caracteres e a NIM não tem os modelos. Só o gpt-oss-20b rodou e reprovou (ADR 0015: nenhum externo grátis executa tarefa). Próximo passo: Gemini 4 Argon, com sonda de ~100 KB antes.

## Avaliado e descartado por ora

- **Troca de modelo pelo % de uso (gatilho de 90%, S10).** A escolha de modelo virou reação ao limite, não decisão do plano (ADR 0013).

- **OmniRoute sempre no meio, com a assinatura do Claude ligada a ele.** Risco nos termos de uso da Anthropic.
- **Modo reserva no `~/.claude/settings.json`.** O Claude Code aplica o arquivo ao vivo em todos os chats abertos e derrubou o chat da S10 (ADR 0012).
