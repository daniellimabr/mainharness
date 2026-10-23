# ADR 0012 — Modo reserva no Gemini pelo OmniRoute

- **Status:** rascunho (resultado do spike da S10/T01; versão final na T08)
- **Data:** 2026-10-23
- **Harness:** 0.8.2

## Contexto

O limite de uso do Claude (5 h e semanal) trava as sprints. A retomada agendada (ADR 0011) saiu na S10. A proposta: perto do limite, o Tech Lead entrega as tarefas abertas a trabalhadores `claude -p` que falam com o Gemini através do OmniRoute local, e o chat seguinte abre no Gemini.

## Resultado do spike (23/10)

**Montagem:** OmniRoute global (`npm install -g omniroute`) em `http://localhost:20128`, com o provedor Gemini e uma conta Google grátis dedicada. A chave do OmniRoute fica em `~/.harness/config.json` (`reserve.url` e `reserve.token`), fora de qualquer repositório.

**Variáveis (só no processo):**
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

**Trabalhador:** `claude -p` com `gemini-3.5-flash-lite` criou `soma.js` numa pasta temporária, em 183 s e com cerca de 10 pedidos (100 mil tokens de entrada, a maior parte do system prompt do Claude Code). Funciona; é lento, mas serve para trabalho em segundo plano.

**O que quebra:**
- o trabalhador chamou a ferramenta `PowerShell`, fora do `--allowedTools` do teste, e não conseguiu rodar o `node`. O `hx reserve run` precisa liberar as ferramentas de que a tarefa precisa;
- aviso `unrecognized_model` no título da sessão (inofensivo);
- os conectores do claude.ai somem quando o token está definido (esperado);
- o custo que o Claude Code mostra (US$ 0,83) é estimado pela tabela do Claude; o Gemini grátis custa US$ 0.

**Chat:** o mesmo caminho (as variáveis no `settings.json`) é o que o `hx reserve on` grava; falta o teste com o chat aberto, na T04.

## Alternativas

- **`gemini -p` (Gemini CLI) como trabalhador, sem OmniRoute.** Ideia de Daniel. Dispensa o tradutor, mas não roda os hooks, as skills nem o `hx` do Claude Code, que garantem o TDD, o lint e as fases da tarefa. Fica como plano B se o OmniRoute der problema.
- **Gemini direto no Claude Code.** Não dá: o Claude Code só fala o formato da Anthropic, e o Gemini não.

## Decisão

Seguir com `claude -p` → OmniRoute → Gemini. Modelo padrão `gemini/gemini-3.5-flash-lite`, configurável em `reserve.model`. T04 a T07 continuam.

## Riscos

- O OmniRoute lista provedores de terceiros (`dva/`, `aug/`, `cxa/` e outros) que revendem modelos pagos. Para a reserva, só o provedor Gemini fica ligado.
- Termos de uso: uma conta Google só para isso, sem somar contas.
- A lentidão do plano grátis pode mudar sem aviso.
