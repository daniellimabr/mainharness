# Pedido ao harness: Padronizar exploração e edição de arquivos pelos agentes (Windows, pasta com espaço)

- **Projeto:** dashboard-ia
- **Data:** 2026-10-18
- **Sprint:** S02
- **Prioridade:** alta

## O que precisa

Regra fixa no prompt do Tech Lead, dos clones e do Reviewer, e no template de handoff: (1) ler, buscar e editar arquivos SEMPRE com as ferramentas Read, Grep, Glob, Edit e Write, nunca com cat, sed, grep ou cd no shell; (2) comandos de terminal no Windows pelo PowerShell (hx run ...), sem cd no início; (3) se usar o Bash, nunca usar caminho /c/... nem cd, porque o cwd já é o projeto. Avaliar também um hook pre-bash que bloqueie cd com /c/ e avise para usar as ferramentas de arquivo.

## Por quê

Na S02 do Dashboard IA, um subagente rodou cd "/c/Dashboard IA/src" no Bash e falhou com 'No such file or directory'. O Bash dos subagentes nem sempre monta /c, e a pasta com espaço piora. Leitura e edição pelas ferramentas nativas não dependem de shell nem de caminho, então não falham e gastam menos tokens com saída inútil. Daniel pediu prioridade.

## Exemplo

—
