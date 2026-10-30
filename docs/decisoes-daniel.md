# Decisões de Daniel

Perfil de decisão: o que Daniel já decidiu, por quê, o que foi descartado e o contraponto. O Tech Lead consulta este arquivo **antes de recomendar** e, quando fizer sentido, oferece outra ótica (sem insistir: a decisão é de Daniel). Decisão nova ou revista entra aqui no mesmo dia.

Formato: **Decisão** · **Porquê** · **Descartado** · **Contraponto**.

## Custo e qualidade

### Haiku não entra em evals nem no Reviewer (S09, ADR 0009)
- **Porquê:** perda de qualidade percebida; prefere pagar Sonnet.
- **Descartado:** Haiku nos evals e no Reviewer (mais barato).
- **Contraponto:** a conta de evals e revisão cai mais com Haiku; só a medição prova a perda. Na S11 o Haiku passou a valer para texto já decidido (ADR 0014), então a medição ainda é possível.

### Sonnet na rotina, Opus onde a segurança ou o desenho pedem (S09, ADR 0009)
- **Porquê:** corta a maior parte do custo sem perder qualidade relevante.
- **Descartado:** tudo em Opus (caro) e tudo em Sonnet (plano e revisão de segurança pioram).
- **Contraponto:** erro de plano custa mais que a economia; por isso o planejamento fica em Opus.

### Um modelo fixo por papel, sem troca pelo % de uso (S11, ADR 0013)
- **Porquê:** a escolha de modelo virou reação ao limite de uso, e não decisão do plano; trocar modelo no meio do chat relê o contexto sem cache.
- **Descartado:** gatilho de 90% mandando tarefas ao Gemini; tudo em Opus.
- **Contraponto:** perto do limite o chat para em vez de seguir mais barato; vale o handoff e a retomada (ADR 0011).

### Gemini desligado (S12, ADR 0014)
- **Porquê:** no experimento cego da S12, estourou tempo, saiu do escopo e estragou a codificação (BOM, acentos), mesmo sendo de graça.
- **Descartado:** manter o trabalhador Gemini (ADR 0012); remoção do código foi para o backlog (B115).
- **Contraponto:** base pequena (2 desafios, 1 corrida); outros modelos do OmniRoute só entram depois de novo teste.

### Quem executa: Opus em caminho de erro e dado de arquivo; Haiku só texto fechado; Sonnet no resto (S12, ADR 0014)
- **Porquê:** o Sonnet errou um caso de borda em cada desafio; o Opus venceu os dois.
- **Descartado:** Sonnet em tudo que não é área sensível.
- **Contraponto:** o Opus custa mais; repetir a comparação antes de apertar a regra.

### Modelos externos para o trabalho pesado, Claude como juiz (S14)
- **Porquê:** produzir mais nos projetos sem esbarrar no limite de 5 h e semanal do Claude, sem perder qualidade. Régua mínima: capacidade de Sonnet.
- **Candidatos:** DeepSeek V4 Pro, Gemini 4 Argon, Kimi K3 / GLM-5.3, pelo OmniRoute. Descartado: GPT-6 Astra (pede ChatGPT Plus).
- **Contraponto:** nos índices independentes de out/2026, nenhum externo disponível alcança o Sonnet 5.5; só o teste cego decide. O teste do Gemini na S12 usou o `flash-lite` (modelo leve), então não vale como veredito sobre o Gemini.

### Google: sem upgrade antes do teste (S14)
- **Porquê:** Daniel tem o Google AI Plus; o Pro somado ao Claude pesa no orçamento; prefere evitar. Testa o Argon pela API (paga por uso) e decide com números.
- **Descartado:** assinar o Pro agora.
- **Contraponto:** a cota diária do Gemini CLI no Pro é maior; se o Argon passar, o Pro pode sair mais barato que a API em volume.

### Teste sem nenhum investimento: só modelos grátis do OmniRoute (S14)
- **Porquê:** evitar pôr crédito em provedores. Em 2026-10-29 o OmniRoute respondeu de graça com DeepSeek V4 Pro, Kimi K2.7 Code e GLM-5.2.
- **Descartado:** crédito na DeepSeek, Kimi ou GLM; o Argon pela API paga (a conta grátis dá 429).
- **Contraponto:** provedor grátis tem limite diário e pode cair; o Kimi K3 e o GLM-5.3 não responderam. O Argon só entra pelo mês grátis do Google AI Pro, e só se o DeepSeek decepcionar.

### S14 só com o foco em modelos (S14)
- **Porquê:** a sprint fica enxuta: trabalhador externo, teste e custo por tarefa (B126, B127, B131), que é o que permite comparar os modelos.
- **Descartado:** ajustes rápidos do inbox (B128, B130, B132), B109, B123, que ficam para a próxima.

## Processo

### Reviewer enxuto: uma revisão por onda, máximo 2 reprovações por tarefa (S09, ADR 0009)
- **Porquê:** na S00, caçar desvios gerou reprovações em série e custo sem ganho.
- **Descartado:** revisão por tarefa sem limite.
- **Contraponto:** onda grande esconde qual tarefa falhou; o `hx review` segue por tarefa.

### Sem Writer: o Tech Lead escreve os documentos e se copia para ganhar tempo (S09, ADR 0009)
- **Porquê:** o contexto de um agente novo custa mais que a escrita.
- **Descartado:** delegar documentos a um modelo mais barato.
- **Contraponto:** o Tech Lead gasta contexto principal; a cópia dele resolve quando o volume é grande.

### `pre-bash` protege contra acidente, não contra ataque (S09, ADR 0009)
- **Porquê:** o Claude Code já tem permissões próprias; caçar desvios deliberados não compensa.
- **Descartado:** endurecer o `pre-bash` até cobrir todo desvio.
- **Contraponto:** um comando destrutivo comum que passe é reprovação; é o único critério.

### Retomada automática após o limite de uso (S11, ADR 0011)
- **Porquê:** Daniel não quer ficar de babá; o trabalho continua sozinho depois do reset.
- **Descartado:** esperar Daniel voltar e pedir a retomada.
- **Contraponto:** depende do handoff estar bom; daí a regra de ouro (tudo que importa vai para arquivo).

### Regra de ouro: tudo que importa vai para arquivo; o chat é descartável (S13)
- **Porquê:** compactação e chat novo perdem o que só estava na conversa (decisões, pedidos de Daniel).
- **Descartado:** confiar na memória do chat e no resumo da compactação.
- **Contraponto:** mais arquivos para manter; o handoff e este arquivo existem para isso ser barato.

### Tudo em Sonnet, Opus desligado (2026-10-30)
- **Porquê:** Daniel mandou trocar todos os agentes de Opus para Sonnet (custo e limite semanal).
- **Descartado:** manter Opus em área sensível, contrato do `hx` e revisão final (ADR 0013/0014).
- **Contraponto:** em tarefa sensível o Sonnet erra mais; compensar com handoff listando os casos de erro e Reviewer atento ao escopo.

### Teste cego da S14 com os modelos que a NVIDIA NIM tem (2026-10-30)
- **Porquê:** a rota grátis antiga (`cfp/`, Cloudflare Playground) corta pedido acima de 6.000 caracteres (502 em toda sessão real), e a NIM não tem DeepSeek V4 Pro, Kimi K2.7 Code nem GLM-5.2; Daniel preferiu medir o que existe a encerrar sem dado.
- **Descartado:** encerrar o teste e registrar "nenhum externo executa"; conectar OpenRouter agora.
- **Contraponto:** os modelos trocam (Kimi K2.6, DeepSeek V4.1 Flash, GLM-5.3 Flash, GPT-OSS 20B); a conclusão só vale para eles, e a NIM tem fila e castigo de 2 min por erro.
