// S16 experiment: what the Dashboard hooks cost. Prints (or writes) markdown tables:
// ms per hook (on / HARNESS_DASHBOARD=off), calls, seconds and injected tokens per sprint, event disk growth.
// usage: node scripts/overhead.mjs [--n 20] [--sprints S13,S14,S15] [--out <arquivo.md>]
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const HX = path.join(ROOT, "cli", "dist", "hx.js");
const USAGE =
  "uso: node scripts/overhead.mjs [--n 20] [--sprints S13,S14,S15] [--out <arquivo.md>]";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const nArg = flag("--n") ?? "20";
const sprintsArg = flag("--sprints");
const outFile = flag("--out");
const n = Number(nArg);
if (!/^\d+$/.test(nArg) || n < 1 || args.length) {
  console.error(USAGE);
  process.exit(1);
}

// shortcut: the event log does not record every hook call, so calls come from equivalent event types.
// pre-bash, pre-edit and post-edit emit nothing (calls = 0, real count unknown); pre-compact is
// counted by `handoff` compact events. Upgrade when hooks log their own calls.
const HOOKS = {
  "session-start": (e) => e.type === "session.start",
  prompt: (e) => e.type === "prompt",
  "subagent-start": (e) => e.type === "agent.start",
  "subagent-stop": (e) => e.type === "agent.end",
  stop: (e) => e.type === "turn.end",
  "pre-compact": (e) => e.type === "handoff" && e.data?.mode === "compact",
  "session-end": (e) => e.type === "session.end",
  notification: (e) => e.type === "attention" && e.data?.source === "notification",
  "permission-request": (e) => e.type === "attention" && e.data?.source === "permission",
  "stop-failure": (e) => e.type === "error" && e.data?.source === "stop",
  "post-tool-failure": (e) => e.type === "error" && e.data?.source === "tool",
  "pre-bash": () => false,
  "pre-edit": () => false,
  "post-edit": () => false,
};
// `hx` outputs republished into the chat; calls come from the matching event.
const COMMANDS = {
  "task start": (e) => e.type === "task.start",
  "task phase": (e) => e.type === "task.phase",
  "task done": (e) => e.type === "task.done",
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hx overhead "));
const proj = path.join(tmp, "proj");
fs.mkdirSync(path.join(proj, ".claude"), { recursive: true });
fs.writeFileSync(
  path.join(proj, ".claude", "harness.json"),
  JSON.stringify({
    project: "overhead",
    name: "Overhead",
    version: "0.1.0",
    attachedAt: "2026-10-15T00:00:00Z",
    web: false,
    optionalSkills: [],
  }),
);
fs.mkdirSync(path.join(proj, "docs", "sprints"), { recursive: true });
fs.copyFileSync(
  path.join(ROOT, "templates", "sprint-plan.md"),
  path.join(proj, "docs", "sprints", "S01-plan.md"),
);

const hx = (a, { input = "", off = false, home } = {}) => {
  const env = {
    ...process.env,
    HARNESS_HOME: home,
    CLAUDE_PLUGIN_ROOT: ROOT,
    HARNESS_NO_OPEN: "1",
  };
  delete env.HARNESS_DASHBOARD;
  if (off) env.HARNESS_DASHBOARD = "off";
  const t = performance.now();
  const r = spawnSync(process.execPath, [HX, ...a], { cwd: proj, input, encoding: "utf8", env });
  return { ms: performance.now() - t, out: r.stdout ?? "" };
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const r1 = (x) => Math.round(x * 10) / 10;

function measure() {
  const home = path.join(tmp, "home");
  const sample = JSON.stringify({
    session_id: "overhead",
    cwd: proj,
    source: "startup",
    reason: "other",
    prompt: "oi",
    tool_name: "Bash",
    tool_input: { command: "ls", file_path: path.join(proj, "a.txt") },
  });
  const rows = {};
  for (const name of Object.keys(HOOKS)) {
    const on = [];
    const off = [];
    let chars = 0;
    for (let i = 0; i < n; i++) {
      const a = hx(["hook", name], { input: sample, home });
      if (i === 0) chars = a.out.length;
      on.push(a.ms);
      off.push(hx(["hook", name], { input: sample, off: true, home }).ms);
    }
    rows[name] = { on: r1(median(on)), off: r1(median(off)), tokens: Math.round(chars / 4) };
  }
  // shortcut: commands run once (they change sprint state, so no repeats): single timing, no "off" column.
  for (const a of [
    ["sprint", "approve", "S01"],
    ["sprint", "open", "S01"],
  ])
    hx(a, { home });
  for (const a of ["task start T01", "task phase T01 código", "task done T01"]) {
    const r = hx(a.split(" "), { home });
    rows[a.split(" ").slice(0, 2).join(" ")] = {
      on: r1(r.ms),
      off: null,
      tokens: Math.round(r.out.length / 4),
    };
  }
  return rows;
}

function readLog(dir) {
  const days = [];
  const events = [];
  let invalid = 0;
  if (!fs.existsSync(dir)) return { days, events, invalid };
  for (const f of fs
    .readdirSync(dir)
    .filter((x) => x.endsWith(".jsonl"))
    .sort()) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const lines = text.split("\n").filter((l) => l.trim());
    const day = {
      day: f.slice(0, -6),
      bytes: Buffer.byteLength(text),
      lines: lines.length,
      errors: 0,
    };
    for (const l of lines) {
      if (/"level":\s*"error"|"type":\s*"error"/.test(l)) day.errors++;
      try {
        events.push(JSON.parse(l));
      } catch {
        invalid++;
      }
    }
    days.push(day);
  }
  return { days, events, invalid };
}

/** [from, to] ts of a sprint (open..close, or last event if still open); null when it never opened. */
function interval(events, id) {
  const ts = (type) => events.find((e) => e.sprint === id && e.type === type)?.ts;
  const from = ts("sprint.open");
  if (!from) return null;
  return [from, ts("sprint.close") ?? events.at(-1).ts];
}

const home = process.env.HARNESS_HOME || path.join(os.homedir(), ".harness");
const log = readLog(path.join(home, "events"));
let rows;
try {
  rows = measure();
} finally {
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

const ids = sprintsArg
  ? sprintsArg
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [...new Set(log.events.filter((e) => e.type === "sprint.open").map((e) => e.sprint))];
const spans = ids.length
  ? ids.map((id) => [id, interval(log.events, id)])
  : [["todos os eventos", ["", "￿"]]];

const out = [`# Overhead dos hooks (n=${n}, mediana)`, ""];
const all = { ...HOOKS, ...COMMANDS };
for (const [label, span] of spans) {
  out.push(`## ${label}`, "");
  const evs = span ? log.events.filter((e) => e.ts >= span[0] && e.ts <= span[1]) : [];
  if (!span) out.push("sem eventos (sprint não aberta no log).", "");
  out.push(
    "| hook | ms ligado | ms off | chamadas | s/sprint | tokens/sprint |",
    "|---|---|---|---|---|---|",
  );
  for (const [name, match] of Object.entries(all)) {
    const r = rows[name];
    const calls = evs.filter(match).length;
    out.push(
      `| ${name} | ${r.on} | ${r.off ?? "-"} | ${calls} | ${((calls * r.on) / 1000).toFixed(3)} | ${calls * r.tokens} |`,
    );
  }
  out.push("");
}
out.push("## Eventos em disco", "", "| dia | bytes | linhas | erros |", "|---|---|---|---|");
for (const d of log.days) out.push(`| ${d.day} | ${d.bytes} | ${d.lines} | ${d.errors} |`);
out.push("", `Linhas inválidas ignoradas: ${log.invalid}.`, "");

const text = out.join("\n");
if (outFile) fs.writeFileSync(outFile, text);
else process.stdout.write(text);
