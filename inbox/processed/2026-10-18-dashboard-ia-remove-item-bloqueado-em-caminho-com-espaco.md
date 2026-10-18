# Pedido ao harness: Remove-Item bloqueado em caminho com espaço

- **Projeto:** dashboard-ia
- **Data:** 2026-10-18
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

O bloqueio de remoção do PowerShell não deve tratar um caminho entre aspas com espaço (ex.: "C:\Dashboard IA\tsconfig.tsbuildinfo") como caminho de sistema.

## Por quê

S02: 1 remoção legítima de arquivo gerado dentro do repo foi bloqueada ('system path "C:\Dashboard'); o arquivo ficou sem apagar. Todos os projetos em pasta com espaço sofrem isso.

## Exemplo

—
