# Pedido ao harness: Painel do ponytail desligado por padrão nas máquinas do harness

- **Projeto:** main-harness
- **Data:** 2026-10-16
- **Sprint:** —
- **Prioridade:** media

## O que precisa

O ponytail 5.3.0 (atualizado pelo hx release) mostra um painel acima do prompt e tenta gravar um 'task ledger' que falha no Windows. Daniel prefere desligado. hx setup/doctor gravam ~/.claude/.ponytail-band=off e orientam desligar o Task board.

## Por quê

S02: o painel apareceu em chat novo logo após a v0.3.0 com o aviso 'could not write the task ledger'; duplica o hx usage/metrics. Desligado à mão nesta máquina.

## Exemplo

hx doctor: 'painel do ponytail ligado: rode hx setup para desligar'.
