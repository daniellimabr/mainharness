# ADR 0010 — % de uso pelo endpoint interno do /usage (exceção a "só caminhos oficiais")

- **Status:** aceito (Daniel, aprovação do plano da S07, 2026-10-21)
- **Data:** 2026-10-21
- **Harness:** 0.7.0

## Contexto

O Dashboard IA quer o % real do limite de uso (janela de 5 h e semanal) em vez de uma estimativa. O roadmap (item 3) diz "usar só caminhos oficiais da Anthropic". Na S06, o `hx statusline` leu o % da status line, mas ela não roda no painel do VS Code, onde Daniel trabalha (B064, B065). Não há outro caminho oficial.

## O que a documentação diz

- Os hooks do Claude Code não recebem o % do limite; a única fonte oficial é o JSON da status line (`rate_limits.*`), pesquisado na S05 (`docs/contracts/events.md`).
- O `/usage` do Claude Code lê `GET https://api.anthropic.com/api/oauth/usage` com o token OAuth do login. **Não documentado** pela Anthropic. Fontes da comunidade (busca em 2026-10-21): cabeçalhos `Authorization: Bearer <token>` e `anthropic-beta: oauth-2025-04-20`; resposta com `five_hour` e `seven_day`, cada um com `utilization` (%) e `resets_at`. Uma fonte mostra um formato diferente (lista `limits`), então o formato pode mudar. Houve um caso relatado de 429 persistente (mar/2026).
- O token fica em `~/.claude/.credentials.json`, em `claudeAiOauth.accessToken` (formato da comunidade, não verificado em documentação oficial).

## Alternativas avaliadas

1. **Não fazer nada (só a status line):** respeita a regra, mas o Dashboard fica sem o % para quem usa o VS Code.
2. **Estimar pelo consumo dos transcripts:** oficial, mas o limite da conta não é público; a estimativa erra.
3. **Endpoint interno do `/usage`:** valor real, mesmo que o Claude Code mostra; pode quebrar sem aviso e usa o token do login.

## Decisão

Alternativa 3, como exceção registrada, só para ler o % de uso:

- O hook Stop chama o endpoint no máximo a cada 5 min (marca em `~/.harness/cache/limits.json`, gravada antes da chamada, para um endpoint com erro não ser chamado a cada Stop). Limite de 3 s; a chamada não atrasa a resposta do hook.
- O resultado vira o evento `usage.limits` (`five_hour`, `five_hour_resets_at`, `seven_day`, `seven_day_resets_at`). `hx usage` mostra a última leitura.
- O token só vai no cabeçalho da chamada para `api.anthropic.com`. Nunca é gravado em evento, log, cache ou saída; qualquer erro é engolido sem registro (a mensagem poderia trazer detalhes da chamada).
- Resposta fora do formato conhecido não grava nada. `HARNESS_NO_LIMITS=1` desliga a chamada (usado nos testes).

## Consequências

- O Dashboard tem o % real e o horário de reinício de cada janela; a T05 (retomada após o limite) usa o `resets_at`.
- Risco aceito: a Anthropic pode mudar ou fechar o endpoint. Sinal: `usage.limits` para de aparecer enquanto há uso. Aí, ou se adapta o leitor ao novo formato, ou se volta à alternativa 1.
- A regra "só caminhos oficiais" continua valendo para todo o resto; esta exceção não abre precedente.
