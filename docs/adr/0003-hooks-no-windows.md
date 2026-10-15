# ADR 0003 — Hooks em forma "exec" chamando o `hx`

- **Status:** aceito
- **Data:** 2026-10-15

## Contexto

Windows nativo, caminhos com espaço (`C:\Main Harness`, `C:\Dashboard IA`), hooks precisam ser rápidos e nunca quebrar a sessão.

## O que a documentação diz

- Hook `command` em **forma exec** (quando há `args`): o executável é chamado direto, sem shell; cada item de `args` é um argumento, sem problema de aspas. `${CLAUDE_PLUGIN_ROOT}` é substituído dentro de `command` e `args`, com barras normais no Windows.
- Forma shell usa Git Bash no Windows (ou PowerShell sem Git Bash) e exige aspas em volta da variável.
- Forma exec exige um executável real (`.exe`): `node` serve; `npx`/`.cmd` não.
- Entrada do hook chega em JSON no stdin: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `agent_id`, `agent_type`, e por evento `source` (SessionStart), `tool_name`/`tool_input` (Pre/PostToolUse).
- Saída: exit 0 + JSON (`hookSpecificOutput.additionalContext`, `permissionDecision`, `decision: "block"`); exit 2 = bloqueia (PreToolUse, Stop) ou devolve o stderr ao Claude (PostToolUse). Outros códigos = erro não bloqueante.
- Texto puro no stdout do `SessionStart` vira contexto.
- `Stop` e `SubagentStop` são eventos separados; `SubagentStop` aceita matcher por tipo de agente.

## Decisão

- Todos os hooks: `{"type":"command","command":"node","args":["${CLAUDE_PLUGIN_ROOT}/cli/dist/hx.js","hook","<nome>"]}`.
- Eventos usados: `SessionStart`, `PostToolUse` (`Write|Edit|MultiEdit`), `PreToolUse` (`Bash|PowerShell`), `Stop`, `SubagentStop`, `SessionEnd`.
- Dentro do `hx`, todo hook roda num `try/catch` global: erro vai para `%USERPROFILE%\.harness\logs\hooks-YYYY-MM-DD.log` e o processo sai com 0. Só `pre-bash` (bloqueio) e `post-edit` (erro de lint, exit 2) usam o código 2 de propósito.
- Meta de tempo: < 300 ms no caminho comum. O `hx.js` é um bundle único (esbuild), sem `require` de dependências pesadas fora do caminho de lint.

## Consequências

- Nenhum script `.sh`/`.ps1` no plugin: só Node. Funciona igual em Git Bash e PowerShell.
- Teste de ponta a ponta roda o `hx.js` com `cwd` e `CLAUDE_PLUGIN_ROOT` em pastas com espaço.
