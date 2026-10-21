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

## Avaliado e descartado por ora

**Gateways que trocam o modelo por outros provedores quando a cota acaba** (ex.: OmniRoute). Motivos:

- troca silenciosa de modelo no meio da sprint;
- envio de código a terceiros;
- risco com os termos de uso;
- quebra da contagem de consumo.
