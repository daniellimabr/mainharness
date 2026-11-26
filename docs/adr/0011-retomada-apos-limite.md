# ADR 0011 — Retomada automática do chat após o limite de uso

- **Status:** substituído (retomada removida na S10, v0.9.0; ver ADR 0012, modo reserva). Antes: aceito (Daniel, aprovação do plano da S07, 2026-10-21). Nota (S19): o hook `StopFailure`, que a S13 voltou a usar só para observar, foi removido
- **Data:** 2026-10-21
- **Harness:** 0.7.0

## Contexto

Quando o limite de uso (5 h ou semanal) estoura, a vez do agente acaba e a sprint para até Daniel voltar e mandar continuar (B005). Daniel autorizou em 21/10 a retomada automática. O `resets_at` de cada janela já vem do evento `usage.limits` (ADR 0010).

## O que a documentação diz

- O hook `StopFailure` dispara "quando a vez termina por erro de API". O campo `error` traz o tipo (`rate_limit`, `overloaded`, `server_error`...), e o matcher filtra por ele. A saída e o código de saída são ignorados. A entrada não traz o horário de reinício (code.claude.com/docs/en/hooks, consultado em 2026-10-21).
- `claude --resume <sessão> -p "<texto>"` continua uma sessão existente sem interface, na pasta onde ela foi criada (documentação da CLI do Claude Code).
- `schtasks /create /sc once /sd` lê a data no formato regional da máquina. Com `/xml`, o `StartBoundary` vai em ISO (`AAAA-MM-DDTHH:MM:SS`, hora local), sem depender do idioma (documentação do `schtasks` da Microsoft).

## Alternativas avaliadas

1. **Não fazer nada:** Daniel retoma à mão. Perde horas quando o limite estoura à noite.
2. **Hook Stop + % ≥ 100:** não há sinal limpo no Stop. Depende de uma leitura que pode estar atrasada.
3. **`StopFailure` com matcher `rate_limit`, agendamento único no Agendador do Windows:** sinal oficial do motivo da parada, e a tarefa roda mesmo com o VS Code fechado.

## Decisão

Alternativa 3:

- O `hooks.json` registra `StopFailure` (matcher `rate_limit`) → `hx hook stop-failure`.
- O hook lê o `usage.limits` na hora (sem esperar os 5 min) ou usa a última leitura. Usa o `resets_at` da janela em 100% (a semanal tem prioridade). Se nenhuma estiver em 100%, usa a de 5 h.
- O hook valida a sessão (UUID) e a pasta (absoluta, existente, sem aspas nem `% ^ & | < > ! $` e crase) antes de montar o comando. Entrada fora disso não agenda nada.
- O hook cria a tarefa `MainHarness-Resume-<sessão>` com `schtasks /create /xml ... /f`, para rodar uma vez em `resets_at + 2 min` (ou daqui a 2 min, se o horário já passou). `/f` com nome fixo por sessão faz um segundo estouro trocar o horário em vez de duplicar. A tarefa roda `node <stableDir>/cli/dist/hx.js resume <sessão> "<pasta>"`, na própria pasta. `StartWhenAvailable` cobre o PC dormindo no horário.
- `hx resume` roda `claude --resume <sessão> -p "Continue de onde parou."` na pasta, grava `session.resume`, apaga a tarefa (`schtasks /delete /f`) e o registro em `~/.harness/resume/`.
- `hx doctor` lista as retomadas pendentes. `hx setup` inclui `hx resume`, e o `schtasks` restrito às tarefas `MainHarness-Resume-*`, na regra do modo auto. A regra antiga é substituída, não duplicada.

## Consequências

- A sprint volta sozinha depois do reinício. Os clones param junto, e o Tech Lead retomado os chama de novo pela lista de tarefas.
- A sessão retomada roda sem interface (`-p`). Ferramentas que pediriam aprovação são negadas nessa sessão (não verificado com o modo auto). O que ela fizer aparece no mesmo chat ao reabrir.
- Um novo estouro durante a retomada reagenda a tarefa; o `hx resume` só apaga a tarefa se o horário pendente não mudou enquanto o `claude` rodava.
- Se a leitura nova do uso falhar, vale a última gravada; com reinício já passado, a retomada roda em agora + 2 min e pode bater no limite de novo (inofensivo).
- A tarefa roda o `node.exe` com o usuário logado: uma janela de console pode aparecer enquanto o `claude` trabalha.
- Risco: se o `rate_limit` vier de um 429 passageiro, e não do plano, a retomada fica agendada à toa. É inofensivo: ela só manda continuar.
- Sinal de erro: `session.resume` com `ok: false`, ou retomada pendente no `hx doctor` depois do horário.
