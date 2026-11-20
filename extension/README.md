# Harness Dash

Painel do Main Harness dentro do VS Code. Mostra o projeto, a sprint, as tarefas, os agentes ativos e o consumo, sem abrir o Dashboard IA no navegador.

## De onde lê

A extensão não tem servidor nem porta. Ela lê arquivos que o `hx` grava na sua máquina:

- `~/.harness/projects.json`: os projetos conectados.
- `~/.harness/dashboard/*.json`: o estado de cada projeto (contrato em `docs/contracts/state.md`).

Quando o `hx` atualiza um projeto, a extensão percebe a mudança na pasta e redesenha o painel.

## Instalar

1. Gere o pacote (ou use o `.vsix` que você recebeu): veja "Gerar o .vsix" abaixo.
2. No VS Code, abra a paleta de comandos (`Ctrl+Shift+P`).
3. Escolha **Extensions: Install from VSIX...** e selecione o arquivo `harness-dash-0.1.0.vsix`.
4. Recarregue a janela se o VS Code pedir.

## Abrir

- Paleta de comandos, `Ctrl+Shift+P`: **Abrir Harness Dash**.
- Ou clique no item com o ícone de pulso na barra de status, na parte de baixo da janela. Ele aparece quando a pasta aberta é um projeto do harness.

## Atualizar

Gere um `.vsix` novo e instale de novo com **Extensions: Install from VSIX...**. O VS Code substitui a versão anterior. Não é preciso desinstalar antes.

## Gerar o .vsix

Para quem mantém o repo:

1. Na raiz do repo: `npm run build:ext` (gera `extension/dist/extension.js`).
2. Dentro de `extension/`: `npx @vscode/vsce package --no-dependencies --allow-missing-repository`.

O `.vsix` sai em `extension/harness-dash-0.1.0.vsix` e leva só `dist/extension.js` e `media/` (o que não entra está em `extension/.vscodeignore`).
