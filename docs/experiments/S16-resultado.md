# S16 — Resultado: harness leve × atual e o custo do Dashboard

Protocolo: `S16-protocolo.md`. Dados: `S16/` (corridas, notas, mapa) e `S16-overhead.md`.

## 1. Custo do Dashboard (overhead dos hooks)

- Cada hook de observação custa 5 a 15 ms a mais que com `HARNESS_DASHBOARD=off` (~150–180 ms o processo todo, quase só a partida do Node).
- Por sprint (S13–S15), todos os hooks de observação somados: ~13 a ~30 s de relógio, contra horas de sprint. **Muito abaixo de 2%.**
- Tokens injetados pela observação: só o `session-start` (92 a 690 por sprint). `prompt`, `stop`, `subagent-*` injetam 0. As linhas `task start/phase/done` (~4 a 14 mil tokens por sprint) são do próprio `hx` de processo, não do Dashboard.
- Eventos em disco: ~0,15 a 1,2 MB por dia; 0 linhas inválidas.
- **Conclusão:** o Dashboard não custa o suficiente para desligar. Corrida `sem-dashboard` confirma: não ficou mais barata (1,70 M tokens contra 1,45 M do atual; uma corrida só, ruído).

## 2. Perfil leve × atual × sem-dashboard (3 desafios, Sonnet, juiz cego)

| | atual | leve | sem-dashboard |
|---|---|---|---|
| Nota média (0–25) | 23,3 | 23,3 | 22,3 |
| Tokens totais | 1.453.467 | 859.531 (−41%) | 1.697.421 |
| Custo | US$ 0,672 | 0,524 (−22%) | 0,712 |
| Tempo | 328 s | 216 s (−34%) | 348 s |
| Abertura da sessão | ≈44k | ≈38k (−15%) | ≈44k |

Notas por desafio (atual/leve/sem): D1 23/20/20, D2 24/25/23, D3 23/25/24. Lint e tipos 5/5 em todas; segurança sem falha grave em nenhuma.

## 3. Leitura pelo critério do protocolo

- **Leve vale:** média igual à do atual (diferença 0, limite 2), poupa 41% de tokens totais (limite 20%) e nenhuma falha de segurança. A abertura sozinha poupa 15% (abaixo dos 20%), mas o critério aceita "abertura ou total".
- **Dashboard não vale desligar:** custo ≪ 2% e não injeta contexto sem uso.

## 4. Limites e ressalvas

- (a) Com `HARNESS_DASHBOARD=off`, `stop` e `pre-compact` também perdem a checagem de tipos e o alerta de contexto (T06): não é só observação.
- (b) `hx sprint approve` não tem `--force`; troca de Aprovação segue o fluxo da T04.
- (c) O perfil leve não tira o `~/.claude/CLAUDE.md` nem a memória do usuário (podem continuar carregando); os MCPs de conta contam igual nos 3 perfis.
- (d) Uma corrida por caso: **indica, não prova**. O D1 do leve foi o pior (20) e o D2/D3 os melhores; a variação entre corridas é do tamanho da diferença entre perfis.
- (e) Overhead medido em segundos e tokens por sprint, comparado ao total da sprint (critério ~2%).
- (f) `pre-bash`, `pre-edit` e `post-edit` não aparecem no log de eventos (0 chamadas); o overhead deles vem da medição direta em ms.

## 5. Recomendação ao Daniel

Manter o Dashboard ligado. Oferecer o perfil leve como **opção** para projetos onde o custo de tokens pesa, e repetir 2 a 3 corridas por caso antes de torná-lo padrão. Decisão registrada como proposta no ADR 0017.
