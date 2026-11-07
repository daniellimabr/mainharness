# Pedido ao harness: Attach: preservar regras do harness legado e reorganizar documentos de contexto do repo

- **Projeto:** financeiro
- **Data:** 2026-11-07
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Ao conectar um repo existente (hx attach), o harness deve: (1) PESQUISAR antes se há harness/CLAUDE.md legado e extrair regras específicas do projeto (ex.: como acessar servidor, restrições da máquina, ferramentas proibidas, autonomia por ambiente) e gravá-las num arquivo de regras locais do projeto (ex.: claude-local.md), referenciado pelo CLAUDE.md novo para o Tech Lead sempre ler; regra legada que conflita com o Main Harness não é descartada em silêncio: vai listada para Daniel decidir. (2) RASTREAR documentos de contexto do repo (product.md, PRDs, ADRs, README de arquitetura, docs de infra, backlog, notas soltas) e reconstruí-los no padrão do harness (docs/prd, docs/adr, docs/decisoes-daniel.md, index.md), aproveitando o conteúdo útil em vez de só arquivar, como um organizador de bagunça do repo. (3) Terminar com um relatório curto: o que foi mantido, o que virou doc novo, o que foi descartado e por quê. Deve ser seguro para rodar de novo (idempotente) e não apagar nada do original sem aviso; o original fica arquivado.

## Por quê

No repo financeiro o attach moveu o CLAUDE.md antigo para docs/legacy-harness/ e a regra importante 'SSH sempre via paramiko, nunca ssh.exe, porque a máquina corporativa bloqueia binários' deixou de valer sem ninguém perceber; o Tech Lead chegou a recomendar ssh.exe. Contexto de produto e infra existente também fica sem ser aproveitado para as novas sprints.

## Exemplo

—
