# Pedido ao harness: Registro central de projetos com ID fixo

- **Projeto:** dashboard-ia
- **Data:** 2026-10-16
- **Sprint:** —
- **Prioridade:** alta

## O que precisa

Manter uma lista central (ex.: ~/.main-harness/projects.json) de todos os repos com o harness attached: id fixo (gerado no attach, gravado em .claude/harness.json), nome, caminho local, versao do harness, data do attach. Atualizar no attach/migrate.

## Por quê

O Dashboard IA precisa descobrir os projetos sozinho. O id nao pode ser o caminho, para funcionar em outras maquinas/online no futuro.

## Exemplo

{"v":1,"projects":[{"id":"prj_7f3a","slug":"dashboard-ia","name":"Dashboard IA","path":"C:/Dashboard IA","harness":"0.4.0","attachedAt":"2026-10-15T17:06:57Z"}]}
