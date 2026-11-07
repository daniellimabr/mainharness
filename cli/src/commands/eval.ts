// hx eval <skill> [--failed]|--changed: runs a skill's evals with `claude -p` (Sonnet) and stamps results.json.
import * as path from "node:path";
import { parseArgs } from "../core/args";
import { loadConfig } from "../core/config";
import { commandContext } from "../core/context";
import { evalSkill, type EvalContext } from "../eval/run";
import { versionTags } from "../release/git";
import { evalScope, listSkills } from "../release/skills";

const USAGE = `uso: hx eval <skill> [--failed] | --changed
  Escopo desde a última tag: descrição mudou -> trigger.json; corpo mudou -> evals.json;
  só evals/ mudou -> nada; skill nova -> ambos + baseline sem skill.
  <skill> explícita sem mudança roda ambos. Sonnet, até 3 sessões em paralelo; caso que falha roda de novo (vale 2 de 3).
  --failed: roda só o que falhou na última rodada (mesma skill) e junta com o que passou.`;

export async function run(args: string[]): Promise<number> {
  const p = parseArgs(args);
  const repo = path.resolve(loadConfig().harnessRepo);
  const tag = versionTags(repo).pop() ?? null;
  const all = listSkills(repo);
  let targets: string[];
  if (p.flags.changed) targets = all;
  else {
    const want = p._[0]?.replace(/\\/g, "/").replace(/\/$/, "");
    const hit = all.find((s) => s === want || path.posix.basename(s) === want);
    if (!hit) {
      console.error(want ? `hx eval: skill não encontrada: ${want}\n${USAGE}` : USAGE);
      return 1;
    }
    targets = [hit];
  }
  let ctx: EvalContext = { project: "main-harness", session: null, sprint: null };
  try {
    const c = commandContext(repo);
    ctx = { project: c.id, session: c.session, sprint: c.sprint };
  } catch {
    // harness repo not attached: events still go to main-harness
  }
  let ok = true;
  let ran = 0;
  for (const skill of targets) {
    let scope = evalScope(repo, skill, tag);
    if (!scope.trigger && !scope.evals) {
      if (p.flags.changed) continue;
      scope = { trigger: true, evals: true, isNew: false };
    }
    ran++;
    console.log(
      `${skill}: ${[scope.trigger && "acionamento", scope.evals && "casos"].filter(Boolean).join(" + ")}...`,
    );
    const r = await evalSkill(repo, skill, scope, ctx, { failed: !!p.flags.failed });
    ok &&= r.passed;
    const f = (b?: { passed: number; total: number }) => (b ? `${b.passed}/${b.total}` : "-");
    console.log(
      `${r.passed ? "✓" : "✗"} ${skill}: acionamento ${f(r.trigger)} · casos ${f(r.evals)}` +
        (r.notes ? ` · ${r.notes}` : ""),
    );
  }
  if (!ran) console.log("Nenhuma skill precisa de eval desde a última versão.");
  return ok ? 0 : 1;
}
