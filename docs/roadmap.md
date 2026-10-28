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

## 8. Trabalhadores no Gemini (feito na S10, v0.9.0)

O Tech Lead passa tarefas simples a trabalhadores `claude -p` no Gemini, pelo OmniRoute local, quando a regra do plano manda (ADR 0012 e ADR 0013, guia em `docs/omniroute.md`). O chat nunca muda de modelo: as variáveis do OmniRoute ficam só no processo do trabalhador. Só o provedor Gemini fica ligado, numa conta dedicada, e o `hx usage` conta o trabalhador à parte. Próximos passos: medir quais tarefas o Gemini entrega bem, entender o atraso fixo de ~8 s por pedido no plano grátis e testar outros modelos (`worker.model`).

## 9. Um modelo fixo por papel (feito na S11, v0.10.0)

Opus planeja e revisa, Sonnet orquestra a execução, e quem executa cada tarefa (Gemini, Sonnet ou Opus) sai de uma regra escrita no plano (ADR 0013). O gatilho de 90% saiu. Clones e trabalhadores usam a persona enxuta `executor`. O `sprint.metrics` traz custo e tokens por modelo, e o alerta de contexto passou para 120 mil. Próximo passo: a S12 é a primeira sprint inteira no modelo novo e compara o custo com a S10 e a S11.

## Avaliado e descartado por ora

- **Troca de modelo pelo % de uso (gatilho de 90%, S10).** A escolha de modelo virou reação ao limite, não decisão do plano (ADR 0013).

- **OmniRoute sempre no meio, com a assinatura do Claude ligada a ele.** Risco nos termos de uso da Anthropic.
- **Modo reserva no `~/.claude/settings.json`.** O Claude Code aplica o arquivo ao vivo em todos os chats abertos e derrubou o chat da S10 (ADR 0012).
