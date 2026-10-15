# ADR 0006 — Limite de 250K tokens: compactação gerenciada

- **Status:** aceito (Daniel, 2026-10-15)
- **Data:** 2026-10-15

## Contexto

Ao chegar a 250K tokens de contexto num chat, a sprint precisa seguir sem perder o fio, de preferência sem intervenção de Daniel. O pedido original era "alerta + handoff + continuação num chat novo, automática".

## O que a documentação diz

- O transcript (`~/.claude/projects/<pasta>/<session>.jsonl`) traz `message.usage` em cada resposta. Contexto atual ≈ `input_tokens + cache_read_input_tokens + cache_creation_input_tokens` da última resposta da sessão principal.
- **Compactação automática com janela configurável:** a configuração `autoCompactWindow` (ou a variável `CLAUDE_CODE_AUTO_COMPACT_WINDOW`) define, entre 100000 e 1000000 tokens, o tamanho da janela usada para compactar. O Claude Code resume a conversa sozinho e segue trabalhando no mesmo chat.
- O que a compactação preserva pode ser orientado por uma seção "Compact Instructions" no `CLAUDE.md`.
- Hooks `PreCompact` (gatilho `auto` ou `manual`) e `SessionStart` com `source: "compact"` rodam em volta da compactação; o `SessionStart` pode injetar contexto.
- O hook `Stop` pode impedir o fim do turno (`decision: "block"`) e pedir uma ação ao agente.
- A extensão do VS Code abre um chat novo via `vscode://anthropic.claude-code/open?prompt=<texto>`, **com o prompt preenchido mas não enviado**. Não existe envio automático oficial da primeira mensagem de um chat novo.
- A janela do Opus 5.5 vai até 1M tokens, mas cada turno relê o contexto inteiro (custo cresce) e a qualidade cai com contexto muito grande.

## Alternativas avaliadas

1. **Aumentar o limite** (até 1M): descartada. Mais caro por turno e pior qualidade; só adia o problema.
2. **Chat novo + Enter** (`vscode://...open?prompt=/main-harness:continue`): contexto 100% limpo, mas depende de Daniel apertar Enter. Perde autonomia.
3. **Compactação gerenciada no mesmo chat**: 100% autônoma. O resumo automático perde detalhes; compensado por um handoff estruturado escrito pelo próprio agente antes da compactação e reinjetado depois.

## Decisão: alternativa 3

1. O `/attach` grava no `.claude/settings.json` do projeto `"autoCompactWindow": 250000` (valor de `config.json → contextLimit`) e o `CLAUDE.md` do projeto ganha a seção "Compact Instructions" (manter sprint ativa, tarefa em andamento, arquivos tocados, próximos passos; descartar saídas de ferramentas).
2. `hx hook stop` calcula o contexto. Ao passar de `handoffAt` (padrão 230000) sem handoff recente: grava `alert.context` e bloqueia o fim do turno pedindo ao agente para escrever o handoff com `hx handoff`.
3. `hx hook pre-compact` (gatilho `auto`): grava o evento `handoff` (com `data.mode: "compact"`) apontando para o último handoff; se não houver handoff, grava `alert.context` com `data.handoff: false`.
4. `hx hook session-start` com `source: "compact"`: reinjeta o handoff e o resumo da sprint ativa. O trabalho continua no mesmo chat.
5. `/main-harness:continue` continua existindo para Daniel começar um chat novo quando quiser (lê o último handoff do projeto).

## Como voltar para o "chat novo + Enter" (se a compactação não der certo)

Sinais para voltar: retrabalho ou erros logo após uma compactação, ou tarefas esquecidas (os indicadores da sprint mostram alertas de contexto + reprovações do Reviewer na mesma tarefa).

Passos:
1. Em `config.json`, `contextStrategy: "new-chat"` (o `hx` hoje só implementa `"compact"`; a troca vira um pedido no backlog).
2. Remover/aumentar `autoCompactWindow` nos projetos (migração), para a compactação não disparar antes.
3. No `Stop`, depois do handoff gravado: gravar `handoff` com `data.mode: "new-chat"` e abrir `vscode://anthropic.claude-code/open?prompt=%2Fmain-harness%3Acontinue` (PowerShell `Start-Process`); avisar Daniel: "Contexto cheio. Abri um chat novo: é só apertar Enter."
4. `session-start` (`source: "startup"`) injeta o handoff pendente do projeto; `/main-harness:continue` marca como consumido.

## Consequências

- Sprint segue sem parar para Daniel ao bater o limite.
- O id da sessão não muda após a compactação; o Dashboard conta "compactações" pelo evento `handoff` com `mode: "compact"`.
- O teste automatizado usa limites reduzidos via `HARNESS_CONTEXT_LIMIT`/`HARNESS_HANDOFF_AT`.
