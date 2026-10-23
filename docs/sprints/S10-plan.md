# S10 — Modo reserva com Gemini (o Tech Lead redistribui as tarefas perto do limite), clones em Sonnet e fim da retomada agendada

- **Projeto:** main-harness
- **Versão do harness:** 0.8.2
- **Status:** aguardando aprovação

## Objetivo

O limite de uso do Claude (5 h e semanal) está travando os projetos. Hoje a semana está em 87%, e o Opus responde por 73% do consumo. A sprint ataca o problema por três frentes:

- **gastar menos:** clones em Sonnet por padrão;
- **seguir trabalhando quando o limite chega:** modo reserva no Gemini, através do OmniRoute local. Perto do limite, o Tech Lead tira as tarefas em andamento do Claude e as entrega a trabalhadores no Gemini;
- **tirar o que não funciona:** a retomada agendada após o limite (ADR 0011).

Fecha com a release v0.9.0.

## Escopo

1. **Teste do caminho (spike), antes de qualquer código.**
   - Montagem: OmniRoute na máquina (localhost:20128) com o provedor **Gemini CLI**, entrando por uma **conta Google grátis criada só para isso**. Cota: 1.000 pedidos por dia e 60 por minuto.
   - Precisa provar dois usos:
     - **chat:** Claude Code aberto com `ANTHROPIC_BASE_URL` e token do OmniRoute;
     - **trabalhador:** `claude -p` em segundo plano com as mesmas variáveis só no processo.
   - Os dois fazem uma tarefa pequena de verdade: ler, editar, rodar `hx run`.
   - Registro: o modelo (família Flash), as variáveis, a velocidade e o que quebra.
   - Decisão: se não servir, T04 a T07 param e Daniel decide.
2. **Clones em Sonnet por padrão.**
   - O Tech Lead chama os clones com `model: sonnet`, porque o enquadramento da tarefa já foi feito em Opus.
   - Tarefa complexa vai com `model: opus`. O Tech Lead decide e marca no plano (coluna Agente: "clone (opus)").
   - No modo reserva, tudo roda no Gemini.
   - O handoff não muda.
3. **Remover a retomada agendada (B086, B087; ADR 0011).**
   - Sai: `hx resume`, o hook `StopFailure` (`hooks.json` e `lifecycle.ts`), o aviso do `hx doctor`, a regra do `schtasks` e do `hx resume` no modo auto (`hx setup`), o evento `session.resume` e os testes.
   - A migração da v0.9.0 apaga as tarefas `MainHarness-Resume-*` já agendadas no Windows e a pasta `~/.harness/resume/`.
   - O ADR 0011 passa a "substituído".
   - A leitura do limite (`usage/limits.ts`) continua: o gatilho depende dela.
4. **Chat em modo reserva: `hx reserve on|off|status`.**
   - `on` confere se o OmniRoute responde e grava em `~/.claude/settings.json` (bloco `env`) o endereço, o token e o modelo Gemini para as famílias Opus, Sonnet e Haiku. Assim o chat novo abre no Gemini, no terminal e no VS Code.
   - `off` retira só o que o `on` gravou.
   - O endereço, o token e o modelo ficam na configuração do harness (`~/.harness/config.json`), nunca no repo.
   - O `session-start` avisa "MODO RESERVA (Gemini)".
   - **Volta automática:** com a reserva ligada, o `session-start` lê o limite do Claude. Se a janela que estourou já reiniciou abaixo do limiar, ele desliga a reserva e avisa.
5. **`hx usage` com a reserva à parte.** Modelo fora da tabela de preços (Gemini) entra numa linha "reserva": tokens contados, custo US$ 0, sem misturar com o Claude.
6. **Trabalhador no Gemini: `hx reserve run TNN <handoff>`.**
   - Roda `claude -p` em segundo plano, na pasta do projeto, com as variáveis do OmniRoute só nesse processo e o handoff da tarefa como pedido.
   - O relatório vai para `~/.harness/reserve/<sprint>-<tarefa>.md`.
   - No fim, roda `hx task phase TNN fila` e grava os eventos `reserve.start` e `reserve.end`.
   - Segue rodando mesmo depois que o chat do Tech Lead estourar o limite.
   - Um trabalhador por vez, por causa do limite de 60 pedidos por minuto.
7. **Gatilho e roteamento pelo Tech Lead.**
   - **Limiar:** padrão de 90% na janela de 5 h ou na semanal, configurável.
   - **Aviso:** o limite é conferido no fim de cada vez (hook `Stop`) e na saída dos `hx task start|done|phase`, que o Tech Lead roda o tempo todo na sprint. Passou do limiar, o aviso manda usar a skill `reserve`, uma vez por sessão.
   - **Skill nova `reserve` (procedimento do roteamento):**
     1. parar os clones em andamento;
     2. escrever o handoff de cada tarefa aberta, com o que já está feito na árvore de trabalho;
     3. despachar cada uma com `hx reserve run`, uma por vez;
     4. rodar `hx reserve on`;
     5. avisar Daniel para abrir um chat novo com `/main-harness:continue`, que já abre no Gemini e recolhe os relatórios.
   - **Simulação:** Daniel chama `/main-harness:reserve` durante uma tarefa, e o Tech Lead executa o mesmo roteamento sem o limite ter chegado.
8. **Documentação.**
   - ADR 0012 (modo reserva): substitui o descarte do OmniRoute no roadmap e registra a conta separada, a cota, os riscos de termos de uso e o resultado do spike.
   - Roadmap atualizado.
   - Guia de instalação em `docs/modo-reserva.md`.

## Fora de escopo

- OmniRoute sempre no meio, com a assinatura do Claude ligada a ele: risco nos termos da Anthropic.
- Trocar de modelo dentro de um chat aberto: o Claude Code lê o endereço só ao abrir; por isso existem os trabalhadores e o chat novo.
- Provedor pago, NVIDIA NIM (limite de 40 pedidos/min) e outros grátis: avaliados na conversa de 23/10.
- Várias contas Google para somar cota: viola os termos do Google.
- Outros 15 itens novos do inbox (B078–B085, B088–B094): ficam no backlog.

## Critérios de aceite

1. **Spike:** o ADR 0012 registra o chat e o trabalhador `claude -p` fazendo uma tarefa real no Gemini, com as variáveis e o modelo (ou o motivo de não servir).
2. **Clones em Sonnet:** `agents/tech-lead.md` manda chamar os clones com `model: sonnet` e, em tarefa complexa, com `model: opus`. Na próxima sprint, o `hx usage` mostra os clones (`main-harness:tech-lead`) majoritariamente em Sonnet.
3. **Retomada removida:**
   - nenhuma referência a `resume.ts`, `stopFailure`, `StopFailure`, `MainHarness-Resume` ou `session.resume` no código, nos testes, no `hooks.json` ou na regra do `hx setup`;
   - a migração, com um `schtasks` falso, lista e apaga as tarefas `MainHarness-Resume-*` e remove `~/.harness/resume/`;
   - o `events.md` registra que o evento saiu na v0.9.0.
4. **Chat em modo reserva:**
   - `hx reserve on` com o OmniRoute fora do ar: avisa e não grava nada;
   - `on` com o OmniRoute no ar: grava o bloco `env` sem apagar outras chaves do `settings.json`;
   - `off`: devolve o `settings.json` como estava;
   - o `session-start` mostra o aviso;
   - com a janela já reiniciada abaixo do limiar, o `session-start` desliga a reserva e avisa.
5. **`hx usage`:** consumo de modelo Gemini aparece na linha "reserva" com US$ 0, e o total do Claude não muda.
6. **Trabalhador:** `hx reserve run` com um `claude` falso:
   - recebe as variáveis do OmniRoute só no processo filho;
   - grava o relatório, marca a fase `fila` e emite os dois eventos;
   - com outro trabalhador rodando, recusa;
   - com tarefa ou handoff inválido, recusa sem rodar nada.
7. **Gatilho:**
   - com o limite em 91%, o `Stop` e a saída do `hx task` trazem o aviso da skill `reserve`, uma vez por sessão;
   - com 89%, não trazem.
   - `skills/reserve` passa nos evals (`hx eval reserve`).
   - Na simulação de Daniel numa sprint de verdade, a tarefa em andamento termina pelo trabalhador no Gemini e é commitada pelo Tech Lead no chat novo.
8. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T03: limpeza das tarefas agendadas com `schtasks` falso.
  - T04 (`cli/test/reserve.test.ts`): `on` (OmniRoute fora e no ar), `off`, `status` e a volta no `session-start`, com `settings.json` em `HOME` temporário e leitura de limite falsa.
  - T05 (`cli/test/usage.test.ts`): linha reserva.
  - T06 (`cli/test/reserve-run.test.ts`): trabalhador com `claude` falso (variáveis, relatório, fase, eventos, um por vez, entrada inválida).
  - T07 (`cli/test/reserve-trigger.test.ts`): 91% × 89%, uma vez por sessão, no `Stop` e no `hx task`.
- **Evals:** T07 roda `hx eval reserve` (skill nova: acionamento + casos).
- **E2E (Daniel):**
  - **Simulação:** durante uma tarefa de uma sprint real, Daniel chama `/main-harness:reserve`. O Tech Lead para o clone, faz o handoff e despacha para o Gemini. Daniel abre o chat novo, e o `/main-harness:continue` recolhe e commita.
  - **Manual:** `hx reserve on`, chat novo, uma tarefa no Gemini, `hx reserve off`.
  - O Release Report compara: atrito, tarefas perdidas e qualidade do Gemini.
- Tudo em pastas temporárias (`HARNESS_HOME`, `HOME`). Nenhum teste chama o `claude`, o OmniRoute ou o `schtasks` de verdade.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | Spike: chat e `claude -p` → OmniRoute → Gemini CLI (conta dedicada) | tech-lead + Daniel | `docs/adr/0012-modo-reserva.md` (rascunho do resultado) | — | 40 min | 29 min |
| T02 | Clones em Sonnet por padrão; Opus em tarefa complexa | tech-lead | `agents/tech-lead.md` | — | 5 min | 4 min |
| T03 | Remover a retomada agendada + migração que limpa as tarefas | clone A (opus) | `cli/src/commands/resume.ts` (apaga), `cli/test/resume.test.ts` (apaga), `cli/src/hooks/lifecycle.ts`, `cli/src/hooks/index.ts`, `hooks/hooks.json`, `cli/src/commands/doctor.ts`, `cli/test/doctor.test.ts`, `cli/src/commands/setup.ts`, `cli/test/setup.test.ts`, `cli/src/core/proc.ts`, `cli/src/events/schema.ts`, `cli/src/migrations*`, `docs/contracts/events.md`, `docs/adr/0011-retomada-apos-limite.md` | — | 25 min | 18 min |
| T04 | `hx reserve on\|off\|status`, aviso e volta no `session-start` | clone B (opus) | `cli/src/commands/reserve.ts`, `cli/test/reserve.test.ts`, `cli/src/core/config.ts`, `cli/src/hooks/session-start.ts` | T01 | 30 min | 22 min |
| T05 | `hx usage`: linha reserva para modelo fora da tabela | clone C | `cli/src/usage/*` (fora `limits.ts`), `cli/src/commands/usage.ts`, `cli/test/usage.test.ts` | T01 | 15 min | 11 min |
| T06 | Trabalhador `hx reserve run TNN <handoff>` | clone B (opus) | `cli/src/commands/reserve.ts`, `cli/test/reserve-run.test.ts`, `cli/src/events/schema.ts`, `docs/contracts/events.md` | T03, T04 | 30 min | 22 min |
| T07 | Gatilho no limiar (`Stop` + `hx task`) e skill `reserve` com evals | tech-lead (skill) + clone A (código) | `cli/src/hooks/lifecycle.ts`, `cli/src/commands/task.ts`, `cli/test/reserve-trigger.test.ts`, `skills/reserve/*` | T03, T06 | 35 min | 25 min |
| T08 | ADR 0012 final, roadmap e guia `docs/modo-reserva.md` | tech-lead | `docs/adr/0012-modo-reserva.md`, `docs/roadmap.md`, `docs/modo-reserva.md` | T01 | 20 min | 14 min |
| T09 | Backlog, CHANGELOG e release v0.9.0 (`hx release minor`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md` | T01–T08 | 15 min | 11 min |

**Ondas:**

1. T01 (Tech Lead com Daniel), T02 (Tech Lead) e T03 (clone A).
2. T04 (clone B), T05 (clone C) e T08 (Tech Lead).
3. T06 (clone B, continua de onde parou na T04).
4. T07: o clone A faz o código, e o Tech Lead faz a skill e os evals.
5. T09.

O Reviewer revisa por onda, sem linha própria. T03, T04, T06 e T07 mexem em hooks, no `hx setup`, no `settings.json` do usuário e em processo filho (superfície de segurança) e usam `model: opus`.

**Paralelismo:**

- Nenhuma tarefa da mesma onda cruza arquivo com outra.
- `lifecycle.ts`, `session-start.ts`, `schema.ts` e `events.md` passam por T03, T04, T06 e T07 em ondas diferentes.
- `cli/src/index.ts` (sai `resume`, entra `reserve`), `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`.
- T03 apaga `resume.ts`. O Tech Lead tira o `resume` do roteador (`index.ts`) na abertura da onda 1 (B069).

**Git:** um commit por tarefa na `main`, no formato `<tipo>(S10/TNN): <resumo>`.

**Histórico (hx metrics, soma até a entrega):**

| Sprint | Previsto | Corrido | Soma bruta | Soma real |
|---|---|---|---|---|
| S09 | 14 min | 59 min | 1 h 20 min | 1 h 44 min |
| S08 | 16 min | 33 min | 1 h 15 min | 26 min |
| S07 | 36 min | 52 min | 2 h 20 min | 1 h 13 min |

Fator, só das sprints com fase `revisão`:

- **soma:** S09 1,30, S08 0,35 e S07 0,52, média **0,72**;
- **relógio:** S09 1,31, S08 0,94 e S07 0,65, média **0,97**.

A S09 subiu por causa dos evals e da release.

**Total estimado:**

- **Soma:** ~2 h 35 min (bruta 3 h 35 min × 0,72).
- **Relógio:** ~2 h 25 min de agente. É o caminho T01 → T04 → T06 → T07 → T09 (2 h 30 min brutos) × 0,97.
- Ficam à parte: o tempo de Daniel no spike (criar a conta Google e entrar no OmniRoute), a simulação e o pedido de release.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-23 10:03:38 (horário de Brasília) — UTC 2026-10-23T13:03:38Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `4329dd7486e69e2ab84ce8c7db429393267e66677fa064459a6ecb7b547c33d9`
- **Versão do harness:** 0.8.2
