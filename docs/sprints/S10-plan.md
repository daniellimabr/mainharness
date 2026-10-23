# S10 — Trabalhadores no Gemini (o Tech Lead delega o que for viável), clones em Sonnet e fim da retomada agendada

- **Projeto:** main-harness
- **Versão do harness:** 0.8.2
- **Status:** aguardando aprovação (revisão de 23/10, 12:00)

## Objetivo

O limite de uso do Claude (5 h e semanal) está travando os projetos. Hoje a semana está em 87%, e o Opus responde por 73% do consumo. A sprint ataca o problema por três frentes:

- **gastar menos Claude:** clones em Sonnet por padrão e, **sempre que parecer viável ao Tech Lead**, a tarefa vai para um **trabalhador no Gemini** (via OmniRoute local; outros modelos no futuro). Perto do limite, tudo que estiver aberto vai para os trabalhadores;
- **nunca trocar o modelo dos chats:** Opus, Sonnet e Haiku ficam intactos. O Gemini roda só dentro do processo de cada trabalhador;
- **tirar o que não funciona:** a retomada agendada após o limite (ADR 0011).

Fecha com a release v0.9.0.

**Por que mudou (23/10):** a primeira versão tinha um "modo reserva" que gravava o OmniRoute no `~/.claude/settings.json`. O Claude Code aplica esse arquivo na hora em todos os chats abertos: o chat da S10 passou a mandar o Opus para o OmniRoute e travou ("Ambiguous model"). E Daniel quer o Gemini como forma de poupar o Claude desde já, não só como reserva.

## Escopo

1. **Teste do caminho (spike).** ✅ Feito: `claude -p` → OmniRoute → Gemini funciona; `gemini/gemini-3.5-flash-lite` é o mais rápido (ADR 0012).
2. **Clones em Sonnet por padrão.** ✅ Feito.
3. **Remover a retomada agendada (B086, B087; ADR 0011).** ✅ Feito.
4. **`hx worker status` (no lugar do `hx reserve on|off|status`).**
   - Nenhum comando do harness escreve no `~/.claude/settings.json`. Saem o `on`, o `off`, o aviso e a volta automática no `session-start`.
   - `status` mostra se está configurado, se o OmniRoute responde, o modelo e o trabalhador em andamento, sem expor o token.
   - Configuração em `~/.harness/config.json`, chave `worker` (`url`, `token`, `model`; padrão `gemini/gemini-3.5-flash-lite`), nunca no repo.
5. **`hx usage` com os trabalhadores à parte.** Modelo fora da tabela de preços (Gemini) entra numa linha própria ("fora do Claude"): tokens contados, custo US$ 0, sem misturar com o Claude.
6. **Trabalhador: `hx worker run TNN <handoff>`.**
   - Roda `claude -p` em segundo plano, na pasta do projeto, com as variáveis do OmniRoute **só nesse processo** e o handoff da tarefa como pedido.
   - O relatório vai para `~/.harness/worker/<sprint>-<tarefa>.md`.
   - No fim, roda `hx task phase TNN fila` e grava os eventos `worker.start` e `worker.end`.
   - Segue rodando mesmo depois que o chat do Tech Lead estourar o limite.
   - Um trabalhador por vez (limite de 60 pedidos por minuto do Gemini grátis).
7. **Quando delegar (Tech Lead).**
   - **Regra no `agents/tech-lead.md`:** tarefa viável para o trabalhador vai para ele em vez de um clone. Viável: escopo fechado, poucos arquivos, handoff claro e sem superfície de segurança (hooks, `pre-bash`, attach, release, entrada externa). **Fase de avaliação:** o Tech Lead experimenta tipos diferentes (docs, código, testes, tela nova ou ajuste de tela com a skill `frontend-design` no handoff) e registra no Release Report o que serviu. O Reviewer (Claude) revisa a entrega como a de qualquer clone. Na coluna Agente do plano: "gemini".
   - **Perto do limite:** padrão de 90% na janela de 5 h ou na semanal, configurável. O limite é conferido no hook `Stop` e na saída dos `hx task start|done|phase`. Passou do limiar, o aviso manda usar a skill `worker`, uma vez por sessão.
   - **Skill nova `worker`:** como despachar (handoff, `hx worker run`, um por vez), como recolher (relatório, revisão, commit) e o roteamento perto do limite: parar os clones, escrever o handoff de cada tarefa aberta, despachar e avisar Daniel para abrir um chat novo com `/main-harness:continue` quando o limite reiniciar.
8. **Documentação.**
   - ADR 0012 passa a "Trabalhadores no Gemini pelo OmniRoute": registra a conta separada, a cota, os riscos de termos de uso, o spike e o motivo de nunca mexer no `settings.json`.
   - Roadmap atualizado.
   - Guia de instalação em `docs/omniroute.md` (substitui `docs/modo-reserva.md`).

## Fora de escopo

- Chat no Gemini: exigiria mudar o `settings.json`, o que afeta todos os chats abertos.
- OmniRoute no meio dos chats do Claude (assinatura ligada a ele): ponto único de falha e risco nos termos da Anthropic.
- Outros modelos além do Gemini: a configuração já aceita qualquer modelo do OmniRoute; avaliar em outra sprint.
- Vários trabalhadores em paralelo.
- Várias contas Google para somar cota: viola os termos do Google.
- Outros 15 itens novos do inbox (B078–B085, B088–B094): ficam no backlog.

## Critérios de aceite

1. **Spike:** ✅ ADR 0012 com o resultado.
2. **Clones em Sonnet:** ✅ `agents/tech-lead.md`.
3. **Retomada removida:** ✅ (T03 revisada).
4. **`hx worker status`:**
   - mostra não configurado, OmniRoute fora e OmniRoute no ar com o modelo, sem o token;
   - nenhum comando `hx worker` escreve no `~/.claude/settings.json` (teste confere o arquivo intacto);
   - o `session-start` não tem mais aviso de reserva.
5. **`hx usage`:** consumo de modelo Gemini aparece na linha "fora do Claude" com US$ 0, e o total do Claude não muda.
6. **Trabalhador:** `hx worker run` com um `claude` falso:
   - recebe as variáveis do OmniRoute só no processo filho (o processo pai e o `settings.json` não mudam);
   - grava o relatório, marca a fase `fila` e emite os dois eventos, com o agente "gemini" e o modelo, para o dashboard mostrar quem fez;
   - com outro trabalhador rodando, recusa;
   - com tarefa ou handoff inválido, recusa sem rodar nada.
7. **Delegação:**
   - `agents/tech-lead.md` traz a regra de quando delegar;
   - com o limite em 91%, o `Stop` e a saída do `hx task` trazem o aviso da skill `worker`, uma vez por sessão; com 89%, não;
   - `skills/worker` passa nos evals (`hx eval worker`);
   - **E2E:** na T09 (docs), o Tech Lead delega uma parte ao trabalhador de verdade, recolhe, revisa e commita.
8. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T04 (`cli/test/worker.test.ts`): `status` (sem configuração, OmniRoute fora e no ar) e `settings.json` intacto, em `HOME` temporário.
  - T05 (`cli/test/usage.test.ts`): linha "fora do Claude".
  - T06 (`cli/test/worker-run.test.ts`): trabalhador com `claude` falso (variáveis, relatório, fase, eventos, um por vez, entrada inválida).
  - T07 (`cli/test/worker-trigger.test.ts`): 91% × 89%, uma vez por sessão, no `Stop` e no `hx task`.
- **Evals:** T07 roda `hx eval worker` (skill nova: acionamento + casos).
- **E2E (Daniel):** usar a próxima sprint normalmente; o Release Report da S10 traz a primeira delegação real (T09) e o da S11 compara consumo do Claude, tempo e qualidade do Gemini.
- Tudo em pastas temporárias (`HARNESS_HOME`, `HOME`). Nenhum teste chama o `claude` ou o OmniRoute de verdade.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Spike: chat e `claude -p` → OmniRoute → Gemini CLI (conta dedicada) | tech-lead + Daniel | `docs/adr/0012-modo-reserva.md` (rascunho do resultado) | — | 40 min | 29 min |
| T02 | Clones em Sonnet por padrão; Opus em tarefa complexa | tech-lead | `agents/tech-lead.md` | — | 5 min | 4 min |
| T03 | Remover a retomada agendada + migração que limpa as tarefas | clone A (opus) | (feita) | — | 25 min | 18 min |
| T04 | `hx worker status`, sem `on/off` e sem mexer no `settings.json` | clone B (opus) | `cli/src/commands/worker.ts` (era `reserve.ts`), `cli/test/worker.test.ts`, `cli/src/core/config.ts`, `cli/src/hooks/session-start.ts` | T01 | 15 min | 11 min |
| T05 | `hx usage`: linha "fora do Claude" para modelo fora da tabela | clone C | `cli/src/usage/*` (fora `limits.ts`), `cli/src/commands/usage.ts`, `cli/test/usage.test.ts` | T01 | 15 min | 11 min |
| T06 | Trabalhador `hx worker run TNN <handoff>` | clone B (opus) | `cli/src/commands/worker.ts`, `cli/test/worker-run.test.ts`, `cli/src/events/schema.ts`, `docs/contracts/events.md` | T04 | 30 min | 22 min |
| T07 | Regra de delegação, gatilho no limiar (`Stop` + `hx task`) e skill `worker` com evals | tech-lead (regra + skill) + clone A (código) | `agents/tech-lead.md`, `cli/src/hooks/lifecycle.ts`, `cli/src/commands/task.ts`, `cli/test/worker-trigger.test.ts`, `skills/worker/*` | T06 | 40 min | 29 min |
| T08 | ADR 0012 final, roadmap e guia `docs/omniroute.md` | tech-lead | `docs/adr/0012-*.md`, `docs/roadmap.md`, `docs/omniroute.md`, `docs/modo-reserva.md` (apaga) | T04 | 20 min | 14 min |
| T09 | Backlog, CHANGELOG e release v0.9.0 (`hx release minor`), com parte delegada ao trabalhador (E2E) | tech-lead + gemini + reviewer | `docs/backlog.md`, `CHANGELOG.md` | T01–T08 | 20 min | 14 min |

**Ondas (a partir de agora):**

1. T04 (clone B, refaz sobre o que já existe), T05 (já entregue, vai para revisão) e T08 (Tech Lead).
2. T06 (clone B).
3. T07: o clone A faz o código, e o Tech Lead faz a regra, a skill e os evals.
4. T09.

O Reviewer revisa por onda, sem linha própria. T04, T06 e T07 mexem em hooks e em processo filho com token (superfície de segurança) e usam `model: opus`.

**Paralelismo:**

- Nenhuma tarefa da mesma onda cruza arquivo com outra.
- `cli/src/index.ts` (sai `reserve`, entra `worker`), `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`.

**Git:** um commit por tarefa na `main`, no formato `<tipo>(S10/TNN): <resumo>`.

**Total estimado (restante):** ~1 h 20 min de agente (caminho T04 → T06 → T07 → T09, 1 h 45 min brutos × 0,72 de fator médio de soma; relógio parecido, pois as ondas são em série).

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-23 12:01:25 (horário de Brasília) — UTC 2026-10-23T15:01:25Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `3be509a3796af64f4ff9f8254b02fe12b9d2aec67c950f47b3bea2e5a7a44cb6`
- **Versão do harness:** 0.8.2
