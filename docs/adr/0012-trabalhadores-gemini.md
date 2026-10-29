# ADR 0012 — Trabalhadores no Gemini pelo OmniRoute

- **Status:** substituído pelo ADR 0014 (código, skill `worker` e guia do OmniRoute removidos na S13)
- **Data:** 2026-10-23
- **Harness:** 0.9.0

## Contexto

O limite de uso do Claude (5 h e semanal) trava as sprints. A retomada agendada (ADR 0011) saiu na S10. Daniel quer gastar menos Claude desde já, não só quando o limite chega: tarefas que caibam num modelo mais simples devem rodar fora do Claude.

A primeira versão (rascunho deste ADR) era um "modo reserva": `hx reserve on` gravava as variáveis do OmniRoute no bloco `env` do `~/.claude/settings.json`, para o chat seguinte abrir no Gemini. No teste, o Claude Code **aplicou o arquivo na hora em todos os chats abertos**: o chat da S10 passou a mandar o Opus para o OmniRoute e travou ("Ambiguous model"). O modo reserva foi descartado antes do commit.

## Resultado do spike (23/10)

**Montagem:** OmniRoute global (`npm install -g omniroute`) em `http://localhost:20128`, com o provedor Gemini e uma conta Google grátis dedicada. A chave fica em `~/.harness/config.json` (chave `worker`), fora de qualquer repositório. Guia: [docs/omniroute.md](../omniroute.md).

**Variáveis (só no processo do trabalhador):**
- `ANTHROPIC_BASE_URL=http://localhost:20128` e `ANTHROPIC_AUTH_TOKEN=<token>`;
- `ANTHROPIC_API_KEY` vazio;
- `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL` e `CLAUDE_CODE_SUBAGENT_MODEL` com o modelo Gemini.

O OmniRoute aceita o formato da Anthropic (`/v1/messages`) e traduz para o Gemini.

**Velocidade:**

| Modelo | Pedido "responda ok" | Observação |
|---|---|---|
| `gemini/gemini-3.8-flash` | 283 s | resposta vazia: os 50 tokens foram para o raciocínio |
| `gemini/gemini-3.7-flash` | 186 s | ok |
| `gemini/gemini-3.5-flash-lite` | 22 s | ok |
| `gemini/gemini-2.5-flash` | — | 404: indisponível para conta nova |

A lentidão está no Gemini, não no OmniRoute: o teste do próprio painel levou 44 s e houve um 504 após 110 s.

**Trabalhador:** `claude -p` com `gemini-3.5-flash-lite` criou `soma.js` numa pasta temporária, em 183 s e com cerca de 10 pedidos (100 mil tokens de entrada, a maior parte do system prompt do Claude Code). Funciona; é lento, mas serve para trabalho em segundo plano. Como é o próprio Claude Code com o plugin, hooks, skills e `hx` rodam, e o trabalhador aparece no dashboard (eventos `worker.start`/`worker.end`, agente `gemini`).

**O que quebra:**
- o trabalhador chamou a ferramenta `PowerShell`, fora do `--allowedTools` do teste, e não conseguiu rodar o `node`: o `hx worker run` precisa liberar as ferramentas de que a tarefa precisa;
- aviso `unrecognized_model` no título da sessão (inofensivo);
- os conectores do claude.ai somem quando o token está definido (esperado);
- o custo que o Claude Code mostra é estimado pela tabela do Claude; o `hx usage` põe o trabalhador numa linha "fora do Claude".

## Alternativas

- **Modo reserva no `settings.json`** (rascunho anterior). Descartado: o arquivo vale ao vivo para todos os chats e derruba o chat aberto.
- **`gemini -p` (Gemini CLI) como trabalhador, sem OmniRoute.** Dispensa o tradutor, mas não roda os hooks, as skills nem o `hx`, que garantem TDD, lint e as fases da tarefa. Plano B se o OmniRoute der problema.
- **OmniRoute sempre no meio dos chats do Claude.** Ponto único de falha e risco nos termos da Anthropic.
- **Gemini direto no Claude Code.** Não dá: o Claude Code só fala o formato da Anthropic.

## Decisão

- Trabalhador = `claude -p` → OmniRoute → Gemini, disparado por `hx worker run TNN <handoff>`, **com as variáveis do OmniRoute só no processo filho**. Nenhum comando do harness escreve no `~/.claude/settings.json` (teste confere o arquivo intacto).
- O Tech Lead manda ao trabalhador, **sempre que parecer viável**, tarefas simples e bem delimitadas; revisa e commita como faz com clones. Perto do limite (padrão 90%, `worker.threshold`), tudo o que estiver aberto vai para trabalhadores (skill `worker`).
- Um trabalhador por vez (cota do plano grátis).
- Modelo padrão `gemini/gemini-3.5-flash-lite`, configurável em `worker.model`; a configuração aceita qualquer modelo do OmniRoute.

## Consequências e riscos

- O chat nunca muda de modelo; o trabalho fora do Claude é sempre explícito e aparece no dashboard e no `hx usage`.
- O OmniRoute lista provedores de terceiros (`dva/`, `aug/`, `cxa/` e outros) que revendem modelos pagos: só o provedor Gemini fica ligado.
- Termos de uso: uma conta Google só para isso, sem somar contas.
- A lentidão e a cota do plano grátis podem mudar sem aviso.
