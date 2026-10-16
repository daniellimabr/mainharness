# Pedido ao harness: Bash do Claude Code em pasta com espaço

- **Projeto:** main-harness
- **Data:** 2026-10-16
- **Sprint:** —
- **Prioridade:** media

## O que precisa

orientação (agente tech-lead e doctor) para usar cd "C:/Pasta Com Espaço" no Bash, e checar isso no hx doctor

## Por quê

S01: no Main Harness o Bash não abre /c/Main Harness e imprime erro de cwd a cada comando; no Dashboard IA o Bash não abriu /c/Dashboard IA e o doctor teve de rodar no PowerShell

## Exemplo

cd "C:/Dashboard IA" && hx doctor
