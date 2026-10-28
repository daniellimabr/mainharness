# Handoff — S12 / Desafio 2 (B105): trabalhador que morre sem relatório

## Objetivo
Se o processo do trabalhador morre (ou o OmniRoute cai) antes de gravar o relatório, hoje ninguém fica sabendo: a tarefa fica parada na fila. Quando o `hx` encontrar um trabalhador morto sem relatório, ele grava um **relatório de falha** e **avisa**.

## Estado atual
- `cli/src/commands/worker.ts`: `hx worker run` grava `~/.harness/worker/lock.json` (`{ pid, sprint, task }`); o filho (`_child`) grava o relatório `~/.harness/worker/<sprint>-<tarefa>.md` e apaga o lock no fim. Se o filho morre antes, fica um lock com PID morto e nenhum relatório.
- `hx worker status` hoje só checa o token e o OmniRoute.
- `cli/test/worker-run.test.ts` cobre o `run`; tudo passa hoje.

## Arquivos que pode tocar
- `cli/src/commands/worker.ts`
- `cli/test/worker-run.test.ts`
(Todo o resto: não toque. Não rebuilde `cli/dist`.)

## Regras do comportamento
- "Trabalhador morto sem relatório" = existe lock com `pid`, `sprint` e `task`, o PID não está vivo e não há relatório dessa sprint/tarefa **mais novo que o lock** (data de modificação do arquivo). Um relatório de corrida anterior, mais antigo que o lock, não conta.
- Nesse caso o `hx` grava o relatório de falha em `~/.harness/worker/<sprint>-<tarefa>.md` (o texto diz que o trabalhador **falhou** sem relatório) e imprime um aviso com `<sprint>/<tarefa>` e a palavra "falhou".
- Vale em `hx worker status` (antes de checar token e OmniRoute; o código de saída do status não muda) e em `hx worker run` (antes de iniciar o novo trabalhador, que segue normalmente).
- Avisa uma vez só: a próxima chamada não repete o aviso nem reescreve o relatório.
- Trabalhador vivo, ou relatório mais novo que o lock: nada muda, sem aviso.
- Lock inválido ou sem `sprint`/`task`: ignore, sem gravar nada.

## Critério de pronto
1. O teste de aceite abaixo, colado no fim de `cli/test/worker-run.test.ts`, passa junto com os testes que já existem: `hx run npx vitest run cli/test/worker-run.test.ts`.
2. Tipos e lint zerados: `hx run npx tsc --noEmit -p cli` e `hx run npx eslint cli/src/commands/worker.ts cli/test/worker-run.test.ts --max-warnings 0` e `hx run npx prettier --check cli/src/commands/worker.ts cli/test/worker-run.test.ts`.
3. Mínimo que resolve. Não commite. Relatório curto: o que mudou e o resultado dos comandos.

## Teste de aceite (cole no fim de `cli/test/worker-run.test.ts`)

```ts
describe("hx worker status: worker that died without a report (B105)", () => {
  it("writes a failure report and warns", async () => {
    const wdir = path.join(env.home, "worker");
    fs.mkdirSync(wdir, { recursive: true });
    fs.writeFileSync(
      path.join(wdir, "lock.json"),
      JSON.stringify({ pid: 999999, sprint: "S01", task: "T01" }),
    );
    expect(await run(["status"], deps())).toBe(0);
    expect(fs.readFileSync(path.join(wdir, "S01-T01.md"), "utf8")).toMatch(/falhou/i);
    expect(out.join("\n")).toMatch(/S01\/T01/);
    expect(out.join("\n")).toMatch(/falhou/i);
  });
});
```
