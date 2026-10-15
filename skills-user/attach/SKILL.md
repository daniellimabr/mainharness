---
name: attach
description: Conecta o repo aberto ao Main Harness
disable-model-invocation: true
---

# Conectar este repo ao Main Harness

1. No diretório do projeto aberto, rode:

   ```
   node "C:/harness-stable/cli/dist/hx.js" attach
   ```

2. Se o comando terminar com **código 3**, ele precisa reorganizar arquivos do projeto. Mostre a Daniel o plano de reorganização que o comando imprimiu, peça aprovação explícita e, só depois do "sim", rode de novo com `--approved`:

   ```
   node "C:/harness-stable/cli/dist/hx.js" attach --approved
   ```

3. Se der outro erro, mostre a mensagem a Daniel e pare.

4. No fim, diga a Daniel para **abrir um chat novo** neste projeto: o harness só carrega em um chat novo.
