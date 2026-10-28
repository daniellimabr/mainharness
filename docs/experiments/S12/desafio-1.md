# Handoff — S12 / Desafio 1 (B099): lock do `hx worker run` antes do spawn

## Objetivo
Hoje o `hx worker run` só grava o lock (`~/.harness/worker/lock.json`) **depois** de disparar o trabalhador. Duas chamadas ao mesmo tempo passam pela checagem e disparam dois trabalhadores. Grave o lock **antes** do spawn, para que só um trabalhador rode por vez.

## Estado atual
- `cli/src/commands/worker.ts`, função `start`: checa o lock (`readLock` + `alive`), checa o OmniRoute (`ready`, que é assíncrona), faz o spawn e só então grava o lock com o PID do filho.
- `cli/test/worker-run.test.ts` testa recusas, o spawn com o ambiente certo e o fluxo de ponta a ponta. Tudo passa hoje.

## Arquivos que pode tocar
- `cli/src/commands/worker.ts`
- `cli/test/worker-run.test.ts`
(Todo o resto: não toque. Não rebuilde `cli/dist`.)

## Regras do comportamento
- Duas ou mais chamadas simultâneas de `hx worker run`: só uma dispara o trabalhador; as outras saem com 1, sem spawn.
- Depois do spawn, o lock guarda o PID do filho, a sprint e a tarefa (como hoje).
- Se o comando desistir depois de pegar o lock (OmniRoute fora, sem token, o spawn lançou exceção), ele sai com 1 e **não deixa lock** para trás.
- Lock com PID morto, vazio ou com JSON inválido não bloqueia uma corrida nova.
- Lock com PID vivo continua recusando, sem tocar no arquivo.

## Critério de pronto
1. O teste de aceite abaixo, colado no fim de `cli/test/worker-run.test.ts`, passa junto com os testes que já existem: `hx run npx vitest run cli/test/worker-run.test.ts`.
2. Tipos e lint zerados: `hx run npx tsc --noEmit -p cli` e `hx run npx eslint cli/src/commands/worker.ts cli/test/worker-run.test.ts --max-warnings 0` e `hx run npx prettier --check cli/src/commands/worker.ts cli/test/worker-run.test.ts`.
3. Mínimo que resolve. Não commite. Relatório curto: o que mudou e o resultado dos comandos.

## Teste de aceite (cole no fim de `cli/test/worker-run.test.ts`)

```ts
describe("hx worker run: lock before spawn (B099)", () => {
  it("the lock already exists when the child is spawned", async () => {
    const lock = path.join(env.home, "worker", "lock.json");
    let seen: unknown;
    fakeSpawn.mockImplementationOnce(() => {
      seen = JSON.parse(fs.readFileSync(lock, "utf8"));
      return { pid: 999999, unref: () => undefined };
    });
    expect(await run(["run", "T01", handoff], deps())).toBe(0);
    expect(seen).toMatchObject({ sprint: "S01", task: "T01" });
    expect(JSON.parse(fs.readFileSync(lock, "utf8"))).toMatchObject({
      pid: 999999,
      sprint: "S01",
      task: "T01",
    });
  });

  it("two simultaneous runs spawn only one worker", async () => {
    const codes = await Promise.all([
      run(["run", "T01", handoff], deps()),
      run(["run", "T01", handoff], deps()),
    ]);
    expect(fakeSpawn).toHaveBeenCalledTimes(1);
    expect(codes.sort()).toEqual([0, 1]);
  });
});
```
