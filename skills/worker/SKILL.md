---
name: worker
description: "Passa uma tarefa da sprint a um trabalhador no Gemini (claude -p via OmniRoute, 'hx worker run'), recolhe o relatório, revisa e commita. Use quando a tarefa for simples e bem delimitada (docs, testes, código pequeno sem superfície de segurança), quando o aviso do harness disser que o limite do Claude passou do limiar, ou quando pedirem 'manda pro Gemini', 'usa o trabalhador', 'economiza Claude'. Use também quando pedirem para pôr o chat no Gemini ou o OmniRoute no settings.json (a skill explica por que não e oferece o trabalhador). Não use para clones Claude nem para instalar o OmniRoute (guia em docs/omniroute.md)."
argument-hint: "[TNN | limite]"
---

# Trabalhador no Gemini

O trabalhador é um `claude -p` em segundo plano que fala com o Gemini pelo OmniRoute (ADR 0012). Tem o plugin: hooks, skills e `hx` rodam. **O chat nunca muda de modelo**: nunca escreva no `~/.claude/settings.json` (o Claude Code aplica o arquivo na hora em todos os chats abertos, e isso já travou um chat). Pedido para pôr o chat no Gemini: recuse, explique e ofereça o trabalhador.

## Antes

`hx worker status` precisa dizer **Trabalhador pronto** (se já disse nesta sessão, não repita). Se não, siga com clone Claude e avise Daniel em uma linha (guia: `docs/omniroute.md`).

Decida e aja; não pergunte a Daniel quem faz cada tarefa.

## Quando mandar

Mande, em vez de um clone, quando **tudo** vale:
- escopo fechado, poucos arquivos, handoff claro;
- sem superfície de segurança (hooks, `pre-bash`, attach, release, entrada externa, tokens);
- nenhum outro trabalhador rodando (um por vez: cota do plano grátis).

Fase de avaliação: varie o tipo (docs, testes, código, tela nova ou ajuste de tela) e anote no Release Report o que serviu. Tarefa de tela: o handoff manda chamar a skill `frontend-design` antes do código.

## Despachar

1. Escreva o handoff da tarefa com a skill `handoff` num arquivo dentro do projeto: `.worker/<SNN>-<TNN>-handoff.md` (fora do git; nunca em `.claude/`, que o Claude Code protege). Inclua: "Ao entregar, rode `hx task phase TNN fila`. Não commite."
2. `hx task start TNN` (se ainda não começou). Se recusar, siga para o passo 3: o despacho não depende dele.
3. `hx worker run TNN <arquivo-do-handoff>`. Recusou porque já há um rodando? Use clone ou espere. Falhou por outro motivo? Avise Daniel e mande a tarefa a um clone.
4. Avise Daniel: `[TNN] Título: mandei ao Gemini`, e diga o que vem depois: recolher o relatório, passar pelo Reviewer e commitar. É lento (minutos): siga com outras tarefas.

## Recolher

1. Relatório em `~/.harness/worker/<SNN>-<TNN>.md`. Leia o relatório e o `git diff`, não confie só no relatório.
2. Reviewer revisa como a entrega de qualquer clone.
3. Passou: commit `<tipo>(SNN/TNN): ...` e `hx task done TNN`. Falhou ou ficou ruim: corrija você ou mande a um clone; anote o motivo para o Release Report.

## Perto do limite

Quando o harness avisar que o uso passou do limiar (padrão 90%):
1. Pare de abrir clones.
2. Para **cada** tarefa aberta, grave o handoff dela em `.worker/<SNN>-<TNN>-handoff.md` (skill `handoff`), como em Despachar.
3. Rode `hx worker run` para a primeira (um por vez); as demais ficam na fila.
4. Grave o handoff da sessão (`hx handoff`) com a fila: tarefa despachada e arquivos de handoff das próximas.
5. Termine a resposta, sempre (mesmo que algum passo acima tenha falhado), com: "Quando o limite reiniciar, abra um chat novo com `/main-harness:continue` para recolher os relatórios e despachar a próxima."
