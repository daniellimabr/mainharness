# Pedido ao harness: Modo auto nega git status logo apos hx release falhar

- **Projeto:** main-harness
- **Data:** 2026-10-22
- **Sprint:** —
- **Prioridade:** baixa

## O que precisa

O git status (só leitura) não pode ser negado como Production Deploy quando vem logo depois de um hx release que falhou

## Por quê

S09: o hx release recusou por arquivos sem commit; o git status seguinte, no PowerShell, foi negado como Production Deploy e precisou ir pelo Bash. 1 negação, uns 2 min perdidos.

## Exemplo

—
