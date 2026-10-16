# ADR 0002 — Tech Lead como agente da sessão principal

- **Status:** aceito
- **Data:** 2026-10-15

## Contexto

O Tech Lead deve ser a sessão principal de todo projeto conectado.

## O que a documentação diz

- A configuração `agent` (em qualquer `settings.json`) ou a flag `--agent <nome>` faz a sessão principal assumir o prompt, as ferramentas e o modelo de um agente.
- Um plugin pode ter um `settings.json` na raiz. Dele, só `agent` e `subagentStatusLine` têm efeito, e só enquanto o plugin está ativo.
- Agentes de plugin são chamados pelo nome com prefixo: `main-harness:tech-lead`.
- Agentes de plugin ignoram `hooks`, `mcpServers` e `permissionMode` no frontmatter. `model` aceita o id completo (`claude-opus-5-5`).

## Decisão

- `settings.json` na raiz do plugin com `{"agent": "main-harness:tech-lead"}`. Basta ativar o plugin para a sessão principal virar Tech Lead.
- `agents/tech-lead.md` sem `tools` (herda todas, incluindo `Agent` para criar clones) e com `model: claude-opus-5-5`.
- O `CLAUDE.md` curto do projeto repete em uma linha que a sessão age como Tech Lead (reforço barato, caso o `agent` seja sobrescrito por um `settings.json` do projeto).
- Hooks ficam em `hooks/hooks.json` do plugin, nunca no frontmatter dos agentes.

## Consequências

- Um projeto pode desligar o comportamento com `"agent"` no `.claude/settings.local.json`.
- Validação prática na T14: `claude -p` num projeto com o plugin ativo deve mostrar o agente `main-harness:tech-lead` no `SessionStart` (`agent_type`).
