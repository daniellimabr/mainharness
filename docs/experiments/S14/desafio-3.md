# Handoff — S14 / Desafio 3: `hx worker list`

## Objetivo
Criar `hx worker list`: mostra os apelidos de trabalhador configurados em `~/.harness/config.json` (`workers`), sem nunca revelar o token. A saída é para Daniel ler, em português correto (com acentos).

## Estado atual
- `cli/src/commands/worker.ts` tem `hx worker check` e `hx worker run`; a função `run` faz o roteamento dos subcomandos e hoje cai no uso (`USAGE`) para qualquer outro.
- `cli/src/core/config.ts` define `Worker` (`url`, `model`, `token`, `price?: { input, output }`) e `loadConfig()` lê o `config.json`.
- `cli/test/worker.test.ts` testa `check` e `run`; tudo passa hoje.

## Arquivos que pode tocar
- `cli/src/commands/worker.ts`
- `cli/test/worker.test.ts`
(Todo o resto: não toque. Não rebuilde `cli/dist`.)

## Regras do comportamento
- Uma linha por apelido, em ordem alfabética, no formato `<apelido>  <modelo>  <url>  <preço>` (campos separados por dois espaços), em `stdout`, código de saída 0.
- Preço: `grátis` quando `input` e `output` são 0; `sem preço` quando não há `price`; senão `US$ <input>/<output> por milhão`.
- A `url` aparece sem credenciais: `http://usuario:senha@host:20128/x` mostra `http://host:20128/x`.
- O token **nunca** aparece, nem em `stdout` nem em `stderr`.
- Sem apelidos (`workers` ausente ou vazio): imprime `Nenhum trabalhador configurado.` e sai com 0.
- Apelido com entrada mal formada (`url` ou `model` que não são texto): a linha vira `<apelido>  (mal configurado)`, os outros apelidos continuam listados e o comando sai com 1 no fim.
- `workers` que não é um objeto de apelidos (por exemplo, uma lista ou um texto): escreve em `stderr` uma mensagem dizendo que a configuração de `workers` é inválida e sai com 1, sem listar nada.
- O texto dos avisos usa acentuação correta em UTF-8, sem BOM.

## Critério de pronto
1. O teste de aceite abaixo, colado no fim de `cli/test/worker.test.ts`, passa junto com os testes que já existem: `hx run npx vitest run cli/test/worker.test.ts`.
2. Tipos e lint zerados: `hx run npx tsc --noEmit -p cli` e `hx run npx eslint cli/src/commands/worker.ts cli/test/worker.test.ts --max-warnings 0` e `hx run npx prettier --check cli/src/commands/worker.ts cli/test/worker.test.ts`.
3. Mínimo que resolve. Não commite. Relatório curto: o que mudou e o resultado dos comandos.

## Teste de aceite (cole no fim de `cli/test/worker.test.ts`)

```ts
describe("hx worker list", () => {
  it("lists aliases sorted, without credentials or token", async () => {
    fs.writeFileSync(
      path.join(env.home, "config.json"),
      JSON.stringify({
        workers: {
          zeta: { url: "http://u:p@h:1/x", model: "m/z", token: "sk-zz", price: { input: 0, output: 0 } },
          alfa: { url: "http://h:2", model: "m/a", token: "sk-aa" },
        },
      }),
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(await run(["list"])).toBe(0);
    const lines = log.mock.calls.map((c) => String(c[0]));
    expect(lines[0]).toMatch(/^alfa {2}m\/a {2}http:\/\/h:2 {2}sem preço$/);
    expect(lines[1]).toMatch(/^zeta {2}m\/z {2}http:\/\/h:1\/x {2}grátis$/);
    expect(lines.join("\n")).not.toMatch(/sk-|u:p/);
  });
});
```
