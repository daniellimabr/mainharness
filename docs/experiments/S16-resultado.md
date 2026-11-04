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

## 6. Repetição (retorno de Daniel): 3 corridas por caso, 3 perfis

Daniel pediu mais dados e lembrou que o leve desligou plugins julgados valiosos (ponytail, remember, claude-code-setup, security-guidance). Nova variante **leve-plugins** = leve com esses 4 plugins ligados. 27 corridas, juiz único e cego ().

| | atual | leve | leve-plugins |
|---|---|---|---|
| Nota média (0–25) | 22,2 | 22,8 | 23,3 |
| Pior nota | 21 | 20 | 21 |
| Escondidos | 66/66 | 63/66 | 65/66 |
| Tokens por corrida | 496 mil | 359 mil (−28%) | 426 mil (−14%) |
| Custo | US$ 0,240 | 0,196 (−18%) | 0,236 (−2%) |
| Tempo | 146 s | 107 s | 231 s |

- Qualidade: os 3 perfis ficam a menos de 1,2 ponto entre si, dentro do limite de 2 e dentro do ruído (notas de 20 a 25 no mesmo perfil). **Não há perda de qualidade medida ao tirar contexto**, e nenhuma vantagem medida dos plugins companheiros em nota.
- Economia: o leve puro poupa 28% de tokens; com os plugins sobra 14% (abaixo dos 20% do critério), custo igual ao atual e tempo maior (os plugins rodam hooks e skills a mais; corridas em paralelo também pesam).
- Leve puro: pior mínimo (20) e 3 escondidos falhos em 66; leve-plugins 1 em 66.
- Limites: 3 corridas por caso ainda é amostra pequena; juiz único; o tempo mede 3 corridas em paralelo; a nota não mede o que ponytail/remember dão a longo prazo (memória entre sessões), só o resultado de uma tarefa.
- **Leitura:** o leve-plugins mantém a qualidade (até um pouco acima) e preserva o que Daniel valoriza, mas deixa de economizar o suficiente para ser padrão. O leve puro economiza, mas com mais risco nos escondidos.

## 6. Repetição (retorno de Daniel): 3 corridas por caso, 3 perfis

Daniel pediu mais dados e lembrou que o leve desligou plugins julgados valiosos (ponytail, remember, claude-code-setup, security-guidance). Nova variante **leve-plugins** = leve com esses 4 plugins ligados. 27 corridas, juiz único e cego (`S16/notas-juiz-2.md`).

| | atual | leve | leve-plugins |
|---|---|---|---|
| Nota média (0–25) | 22,2 | 22,8 | 23,3 |
| Pior nota | 21 | 20 | 21 |
| Escondidos | 66/66 | 63/66 | 65/66 |
| Tokens por corrida | 496 mil | 359 mil (−28%) | 426 mil (−14%) |
| Custo | US$ 0,240 | 0,196 (−18%) | 0,236 (−2%) |
| Tempo | 146 s | 107 s | 231 s |

- Qualidade: os 3 perfis ficam a menos de 1,2 ponto entre si (limite 2) e dentro do ruído (notas de 20 a 25 no mesmo perfil). **Sem perda de qualidade medida ao tirar contexto**, e sem vantagem medida dos plugins companheiros em nota.
- Economia: o leve puro poupa 28% de tokens; com os plugins sobra 14% (abaixo dos 20% do critério), custo igual ao atual e tempo maior (hooks e skills a mais; 3 corridas em paralelo também pesam).
- Leve puro: pior mínimo (20) e 3 escondidos falhos em 66; leve-plugins, 1 em 66.
- Limites: 3 corridas por caso ainda é amostra pequena; juiz único; o tempo mede corridas em paralelo; a nota mede uma tarefa, não o que ponytail/remember dão a longo prazo (memória entre sessões). A 1ª versão das corridas leve-plugins não carregava os plugins (bug do bench, corrigido; descartadas em `S16/invalido/`).
- **Leitura:** o leve-plugins mantém a qualidade e preserva o que Daniel valoriza, mas não economiza o bastante para ser padrão. O leve puro economiza, com mais risco nos escondidos.
