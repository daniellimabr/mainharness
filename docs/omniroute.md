# Trabalhadores no Gemini (OmniRoute)

O harness pode passar tarefas a um **trabalhador**: um `claude -p` em segundo plano que fala com o Gemini pelo OmniRoute local. Poupa o Claude desde já e segura a sprint quando o limite (5 h ou semanal) está perto. Decisão e teste: [ADR 0012](adr/0012-trabalhadores-gemini.md).

**O chat nunca muda de modelo.** O harness não escreve no `~/.claude/settings.json`: as variáveis do OmniRoute existem só no processo do trabalhador.

## Instalação (uma vez por máquina)

1. **Conta Google só para isso.** Não use a conta pessoal e não junte contas para somar cota: isso viola os termos do Google.
2. **OmniRoute:**
   ```powershell
   npm install -g omniroute
   omniroute
   ```
   O painel abre em http://localhost:20128. Crie a senha de administrador.
3. **No painel:**
   - em **Providers**, adicione o **Gemini** e entre com a conta dedicada;
   - **desligue os outros provedores**: há revendas de terceiros (`dva/`, `aug/`, `cxa/`...) que receberiam o seu código;
   - deixe desligada a opção "Expor no Claude Code (claude/...)";
   - em **API Keys**, gere uma chave.
4. **Guarde a chave fora do repo**, em `~/.harness/config.json` (troque `COLE_AQUI`):
   ```powershell
   node -e "const fs=require('fs'),f=require('os').homedir()+'/.harness/config.json';const c=JSON.parse(fs.readFileSync(f,'utf8'));c.worker={...c.worker,url:'http://localhost:20128',token:process.argv[1]};fs.writeFileSync(f,JSON.stringify(c,null,2))" COLE_AQUI
   ```
   Opcionais em `worker`: `model` (padrão `gemini/gemini-3.5-flash-lite`) e `threshold` (padrão 90, em %).
5. Confira: `hx worker status` deve dizer **Trabalhador pronto**.

O OmniRoute precisa estar aberto (`omniroute`) enquanto houver trabalhador rodando.

## Uso

| Comando | O que faz |
|---|---|
| `hx worker status` | Diz se está configurado, se o OmniRoute responde e qual modelo (nunca mostra a chave). |
| `hx worker run TNN <handoff>` | Trabalhador em segundo plano faz a tarefa a partir do handoff. Relatório em `~/.harness/worker/<sprint>-<tarefa>.md`. Um por vez. |

**Na sprint, você não precisa rodar nada disso.** O Tech Lead manda ao trabalhador as tarefas que couberem nele (skill `worker`), revisa a entrega e commita como faz com os clones. Perto do limite (90%), o harness avisa e o Tech Lead despacha tudo o que estiver aberto; quando o limite reiniciar, abra um chat novo com `/main-harness:continue` para recolher os relatórios.

O dashboard mostra o trabalhador como agente `gemini`.

## Limites conhecidos

- **Lentidão:** no plano grátis, cada pedido leva de 8 a 10 s, mesmo para responder "ok". Uma tarefa pequena levou 3 min. Serve para trabalho em segundo plano.
- **Cota:** 1.000 pedidos por dia e 60 por minuto. Por isso, um trabalhador por vez.
- **Conectores do claude.ai** não carregam no trabalhador.
- O custo que o Claude Code calcula no trabalhador vem da tabela do Claude. O `hx usage` mostra o trabalhador numa linha à parte ("fora do Claude").
