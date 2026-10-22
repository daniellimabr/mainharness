# S09 — Skill de front-end usada de fato, atualizada nos projetos, e migração sem falha no Windows

- **Projeto:** main-harness
- **Versão do harness:** 0.8.1
- **Status:** aguardando aprovação

## Objetivo

Deixar a skill `frontend-design` (a oficial da Anthropic, `anthropics/skills`) alinhada à fonte e garantir que as atualizações dela cheguem aos projetos já ligados. Hoje a cópia só entra no `attach` e nunca mais muda. Corrigir também a migração que falha ao abrir a sessão quando o Windows trava um arquivo por um instante. Fecha com a release v0.8.2.

## Escopo

1. **B073:** `writeFileAtomic` (`cli/src/core/fsx.ts`) tenta de novo a troca do arquivo temporário (`rename`) quando o Windows devolve `EPERM`, `EBUSY` ou `EACCES` (arquivo aberto por outro processo). São poucas tentativas com espera curta; se todas falharem, o erro sobe como hoje. Caso real: em 22/10, o `session-start` falhou ao gravar `.claude/harness.json` (`EPERM: rename`), e o `hx migrate` manual passou logo depois.
2. **B074:** o `hx migrate`, que roda sozinho no `session-start` quando a versão muda, recopia do catálogo (`skills/optional/`) as skills opcionais que o projeto já tem em `.claude/skills/`. Skill que o projeto não ligou continua fora. Assim, a skill alterada numa release chega a todos os projetos que a usam.
3. **B075:** `frontend-design` alinhada à oficial (`anthropics/skills`, último commit da pasta: `41bbe19`, 03/09). O corpo fica igual ao oficial, com duas exceções:
   - a seção "Show the visual plan", que fez o caso 1 dos evals passar (B007);
   - a descrição nossa, ajustada para os evals de acionamento.

   A frase extra sobre renomear ações sai, e o `SOURCE.md` passa a listar todas as diferenças e o commit novo. Evals da skill rodam (`hx eval frontend-design`).
4. **B076:** a `frontend-design` passa a ser usada de fato. No Dashboard IA ela está instalada desde 16/10, mas foi chamada 0 vezes em 30 sessões: quem cria as telas são os clones, e nada manda chamá-la. Mudanças:
   - `agents/tech-lead.md`: em tarefa que cria ou muda tela, chamar a skill `frontend-design` antes do código (e `dataviz`, se existir, para gráficos), e pôr isso no handoff do clone;
   - `agents/reviewer.md`: em tarefa de tela, conferir o plano visual da skill na entrega e a tela contra ele (celular, tema escuro, foco do teclado, estados vazio e de erro); faltou → reprova.

## Fora de escopo

- **B029** (CI no GitHub): espera o backup remoto (roadmap 4), por decisão de Daniel.
- Copiar a `frontend-design` para projetos que não são web: o `attach` segue decidindo (ADR 0005), e `hx skills enable` liga a skill em qualquer projeto.
- Preservar edição local da skill no projeto: a cópia em `.claude/skills/` é do harness e é sobrescrita na migração.

## Critérios de aceite

1. `rename` falso que dá `EPERM` duas vezes e depois passa: o arquivo é gravado. Se der `EPERM` em todas as tentativas, o erro sobe. Com `ENOENT`, falha na hora, sem nova tentativa.
2. Projeto de teste com `.claude/skills/frontend-design/` antiga: o `migrateProject` deixa a cópia igual à do catálogo. Projeto sem a skill continua sem ela, e uma skill que não é do catálogo fica intacta.
3. Corpo da `frontend-design` igual ao oficial, fora a seção do plano visual e a descrição. O `SOURCE.md` cita o commit `41bbe19` e lista as diferenças. `hx eval frontend-design` passa.
4. `agents/tech-lead.md` e `agents/reviewer.md` trazem a regra da tarefa de tela. Na próxima sprint do Dashboard com tela, a sessão (ou o clone) chama a `frontend-design`, o que se confere no transcript.
5. **Lint e tipos: zero erros e zero avisos.**

## Plano de testes

- **Unitários (tdd-workflow, teste antes do código):**
  - T01 (`cli/test/fsx.test.ts`): `EPERM` transitório, `EPERM` permanente e `ENOENT` sem nova tentativa.
  - T02 (`cli/test/migrate.test.ts`): skill do catálogo atualizada, skill não ligada fica fora, skill de fora do catálogo intacta.
- **Evals:** T03 roda `hx eval frontend-design` (corpo e descrição sob o escopo do ADR 0009).
- **E2E:** na T05, depois da release v0.8.2, abrir uma sessão no Dashboard IA. A migração passa sem aviso de falha, e a `frontend-design` dele fica igual à do catálogo.
- Tudo em pastas temporárias (`HARNESS_HOME`, `HOME`). Nenhum teste chama o `claude` de verdade.

## Tarefas

| Id | Tarefa | Agente | Arquivos | Depende de | Bruta | Planejado |
|---|---|---|---|---|---|---|
| T01 | B073: gravação atômica tenta de novo com arquivo travado no Windows | clone A | `cli/src/core/fsx.ts`, `cli/test/fsx.test.ts` | — | 15 min | 6 min |
| T02 | B074: `hx migrate` recopia as skills opcionais ligadas no projeto | clone B | `cli/src/commands/migrate.ts`, `cli/test/migrate.test.ts` | — | 20 min | 8 min |
| T03 | B075: `frontend-design` alinhada à oficial + evals | tech-lead | `skills/optional/frontend-design/*` | — | 20 min | 8 min |
| T04 | B076: tarefa de tela chama a `frontend-design` e o Reviewer confere | tech-lead | `agents/tech-lead.md`, `agents/reviewer.md` | — | 10 min | 4 min |
| T05 | Backlog (B073–B076), CHANGELOG e release v0.8.2 (`hx release patch`) | tech-lead + reviewer | `docs/backlog.md`, `CHANGELOG.md` | T01–T04 | 15 min | 6 min |

**Ondas:**

1. T01 e T02 em clones; T03 e depois T04 com o Tech Lead ao mesmo tempo.
2. T05.

O Reviewer revisa a onda 1 dentro das tarefas, sem linha própria. A T02 escreve em pastas de projetos (superfície do attach) e usa `model: opus`.

**Paralelismo:** nenhuma tarefa da onda 1 cruza arquivo com outra. `cli/src/index.ts`, `cli/dist/hx.js` e `index.md` são do Tech Lead, com rebuild antes de cada commit que muda `cli/src`. Nenhuma tarefa apaga módulo.

**Git:** um commit por tarefa na `main`, no formato `<tipo>(S09/TNN): <resumo>`.

**Histórico (hx metrics, soma até a entrega):**

| Sprint | Previsto | Corrido | Soma bruta | Soma real |
|---|---|---|---|---|
| S08 | 16 min | 33 min | 1 h 15 min | 26 min |
| S07 | 36 min | 52 min | 2 h 20 min | 1 h 13 min |
| S06 | 1 h 2 min | 27 min | 2 h 23 min | 51 min |

Fator, só das sprints com fase `revisão`:

- **soma:** S08 0,35, S07 0,52 e S06 0,36, média **0,41**;
- **relógio:** S08 0,94, S07 0,65 e S06 0,44, média **0,68**.

**Total estimado:**

- **Soma:** ~33 min (bruta 1 h 20 min × 0,41).
- **Relógio:** ~31 min de agente. É o caminho T03 → T04 → T05 (45 min brutos) × 0,68.
- O teste de Daniel e o pedido de release ficam à parte.

## Aprovação

- **Aprovado por:** Daniel
- **Data/hora:** 2026-10-22 09:45:07 (horário de Brasília) — UTC 2026-10-22T12:45:07Z
- **Hash SHA-256 do plano** (conteúdo antes desta seção, finais de linha normalizados para LF): `110c8618a0ac8e0a7d62851873b48e07919cfe0cf931f9b250e1e5205b50cbe1`
- **Versão do harness:** 0.8.1
