"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// cli/src/core/paths.ts
function harnessHome() {
  return process.env.HARNESS_HOME || path.join(os.homedir(), ".harness");
}
function pluginRoot() {
  if (process.env.CLAUDE_PLUGIN_ROOT) return path.resolve(process.env.CLAUDE_PLUGIN_ROOT);
  if (cachedRoot) return cachedRoot;
  let dir = __dirname;
  for (; ; ) {
    if (fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"))) return cachedRoot = dir;
    const up = path.dirname(dir);
    if (up === dir) throw new Error("plugin root not found");
    dir = up;
  }
}
var fs, os, path, home, cachedRoot;
var init_paths = __esm({
  "cli/src/core/paths.ts"() {
    "use strict";
    fs = __toESM(require("node:fs"));
    os = __toESM(require("node:os"));
    path = __toESM(require("node:path"));
    home = {
      config: () => path.join(harnessHome(), "config.json"),
      projects: () => path.join(harnessHome(), "projects.json"),
      events: () => path.join(harnessHome(), "events"),
      logs: () => path.join(harnessHome(), "logs"),
      state: () => path.join(harnessHome(), "state"),
      handoffs: (project) => path.join(harnessHome(), "handoffs", project),
      usageCache: () => path.join(harnessHome(), "cache", "usage")
    };
    cachedRoot = null;
  }
});

// cli/src/hooks/index.ts
var hooks_exports = {};
__export(hooks_exports, {
  run: () => run
});
function run(_args) {
  return 0;
}
var init_hooks = __esm({
  "cli/src/hooks/index.ts"() {
    "use strict";
  }
});

// cli/src/commands/task.ts
var task_exports = {};
__export(task_exports, {
  run: () => run2
});
function run2(_args) {
  console.error("hx task: ainda n\xE3o implementado");
  return 1;
}
var init_task = __esm({
  "cli/src/commands/task.ts"() {
    "use strict";
  }
});

// cli/src/commands/sprint.ts
var sprint_exports = {};
__export(sprint_exports, {
  run: () => run3
});
function run3(_args) {
  console.error("hx sprint: ainda n\xE3o implementado");
  return 1;
}
var init_sprint = __esm({
  "cli/src/commands/sprint.ts"() {
    "use strict";
  }
});

// cli/src/commands/review.ts
var review_exports = {};
__export(review_exports, {
  run: () => run4
});
function run4(_args) {
  console.error("hx review: ainda n\xE3o implementado");
  return 1;
}
var init_review = __esm({
  "cli/src/commands/review.ts"() {
    "use strict";
  }
});

// cli/src/commands/handoff.ts
var handoff_exports = {};
__export(handoff_exports, {
  run: () => run5
});
function run5(_args) {
  console.error("hx handoff: ainda n\xE3o implementado");
  return 1;
}
var init_handoff = __esm({
  "cli/src/commands/handoff.ts"() {
    "use strict";
  }
});

// cli/src/commands/run.ts
var run_exports = {};
__export(run_exports, {
  run: () => run6
});
function run6(_args) {
  console.error("hx run: ainda n\xE3o implementado");
  return 1;
}
var init_run = __esm({
  "cli/src/commands/run.ts"() {
    "use strict";
  }
});

// cli/src/commands/request.ts
var request_exports = {};
__export(request_exports, {
  run: () => run7
});
function run7(_args) {
  console.error("hx request: ainda n\xE3o implementado");
  return 1;
}
var init_request = __esm({
  "cli/src/commands/request.ts"() {
    "use strict";
  }
});

// cli/src/commands/metrics.ts
var metrics_exports = {};
__export(metrics_exports, {
  run: () => run8
});
function run8(_args) {
  console.error("hx metrics: ainda n\xE3o implementado");
  return 1;
}
var init_metrics = __esm({
  "cli/src/commands/metrics.ts"() {
    "use strict";
  }
});

// cli/src/commands/usage.ts
var usage_exports = {};
__export(usage_exports, {
  run: () => run9
});
function run9(_args) {
  console.error("hx usage: ainda n\xE3o implementado");
  return 1;
}
var init_usage = __esm({
  "cli/src/commands/usage.ts"() {
    "use strict";
  }
});

// cli/src/commands/attach.ts
var attach_exports = {};
__export(attach_exports, {
  run: () => run10
});
function run10(_args) {
  console.error("hx attach: ainda n\xE3o implementado");
  return 1;
}
var init_attach = __esm({
  "cli/src/commands/attach.ts"() {
    "use strict";
  }
});

// cli/src/commands/migrate.ts
var migrate_exports = {};
__export(migrate_exports, {
  run: () => run11
});
function run11(_args) {
  console.error("hx migrate: ainda n\xE3o implementado");
  return 1;
}
var init_migrate = __esm({
  "cli/src/commands/migrate.ts"() {
    "use strict";
  }
});

// cli/src/commands/skills.ts
var skills_exports = {};
__export(skills_exports, {
  run: () => run12
});
function run12(_args) {
  console.error("hx skills: ainda n\xE3o implementado");
  return 1;
}
var init_skills = __esm({
  "cli/src/commands/skills.ts"() {
    "use strict";
  }
});

// cli/src/commands/doctor.ts
var doctor_exports = {};
__export(doctor_exports, {
  run: () => run13
});
function run13(_args) {
  console.error("hx doctor: ainda n\xE3o implementado");
  return 1;
}
var init_doctor = __esm({
  "cli/src/commands/doctor.ts"() {
    "use strict";
  }
});

// cli/src/commands/setup.ts
var setup_exports = {};
__export(setup_exports, {
  run: () => run14
});
function run14(_args) {
  console.error("hx setup: ainda n\xE3o implementado");
  return 1;
}
var init_setup = __esm({
  "cli/src/commands/setup.ts"() {
    "use strict";
  }
});

// cli/src/commands/release.ts
var release_exports = {};
__export(release_exports, {
  run: () => run15
});
function run15(_args) {
  console.error("hx release: ainda n\xE3o implementado");
  return 1;
}
var init_release = __esm({
  "cli/src/commands/release.ts"() {
    "use strict";
  }
});

// cli/src/commands/rollback.ts
var rollback_exports = {};
__export(rollback_exports, {
  run: () => run16
});
function run16(_args) {
  console.error("hx rollback: ainda n\xE3o implementado");
  return 1;
}
var init_rollback = __esm({
  "cli/src/commands/rollback.ts"() {
    "use strict";
  }
});

// cli/src/core/fsx.ts
function readJson(file, fallback) {
  try {
    return JSON.parse(fs3.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
var fs3;
var init_fsx = __esm({
  "cli/src/core/fsx.ts"() {
    "use strict";
    fs3 = __toESM(require("node:fs"));
  }
});

// cli/src/core/version.ts
var version_exports = {};
__export(version_exports, {
  bumpVersion: () => bumpVersion,
  compareVersions: () => compareVersions,
  harnessVersion: () => harnessVersion
});
function harnessVersion(root = pluginRoot()) {
  return readJson(path3.join(root, ".claude-plugin", "plugin.json"), {}).version ?? "0.0.0";
}
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
function bumpVersion(v, kind) {
  const [maj = 0, min = 0, pat = 0] = v.split(".").map(Number);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}
var path3;
var init_version = __esm({
  "cli/src/core/version.ts"() {
    "use strict";
    path3 = __toESM(require("node:path"));
    init_fsx();
    init_paths();
  }
});

// cli/src/core/log.ts
var fs2 = __toESM(require("node:fs"));
var path2 = __toESM(require("node:path"));
init_paths();
function logError(scope, err) {
  try {
    const dir = home.logs();
    fs2.mkdirSync(dir, { recursive: true });
    const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    fs2.appendFileSync(
      path2.join(dir, `hx-${day}.log`),
      `${(/* @__PURE__ */ new Date()).toISOString()} [${scope}] ${msg}
`
    );
  } catch {
  }
}

// cli/src/index.ts
var COMMANDS = {
  hook: () => Promise.resolve().then(() => (init_hooks(), hooks_exports)),
  task: () => Promise.resolve().then(() => (init_task(), task_exports)),
  sprint: () => Promise.resolve().then(() => (init_sprint(), sprint_exports)),
  review: () => Promise.resolve().then(() => (init_review(), review_exports)),
  handoff: () => Promise.resolve().then(() => (init_handoff(), handoff_exports)),
  run: () => Promise.resolve().then(() => (init_run(), run_exports)),
  request: () => Promise.resolve().then(() => (init_request(), request_exports)),
  metrics: () => Promise.resolve().then(() => (init_metrics(), metrics_exports)),
  usage: () => Promise.resolve().then(() => (init_usage(), usage_exports)),
  attach: () => Promise.resolve().then(() => (init_attach(), attach_exports)),
  migrate: () => Promise.resolve().then(() => (init_migrate(), migrate_exports)),
  skills: () => Promise.resolve().then(() => (init_skills(), skills_exports)),
  doctor: () => Promise.resolve().then(() => (init_doctor(), doctor_exports)),
  setup: () => Promise.resolve().then(() => (init_setup(), setup_exports)),
  release: () => Promise.resolve().then(() => (init_release(), release_exports)),
  rollback: () => Promise.resolve().then(() => (init_rollback(), rollback_exports)),
  version: async () => ({
    run: async () => {
      const { harnessVersion: harnessVersion2 } = await Promise.resolve().then(() => (init_version(), version_exports));
      console.log(harnessVersion2());
      return 0;
    }
  })
};
var HELP = `hx <command> [args]

  hook <name>                 hooks do Claude Code (stdin JSON)
  task start|done <id>        marca tarefa do sprint ativo
  sprint open|close|approve|feedback|status <id>
  review pass|fail <task>     resultado da revis\xE3o
  handoff [--file f|--show]   grava/mostra o handoff
  run <cmd...>                roda e mostra s\xF3 falhas e resumo
  request --title t ...       cria pedido no inbox do harness
  metrics [sprint]            indicadores da sprint
  usage [--session id]        consumo a partir dos transcripts
  attach [dir]                conecta um repo ao harness
  migrate                     aplica migra\xE7\xF5es do harness no projeto
  skills on|off <nome>        liga/desliga skill opcional
  doctor                      confere o ambiente
  setup                       instala\xE7\xE3o da m\xE1quina (uma vez)
  release patch|minor|major   publica vers\xE3o do harness
  rollback                    volta a vers\xE3o est\xE1vel anterior
  version                     vers\xE3o do harness`;
async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(HELP);
    return 0;
  }
  const load = COMMANDS[cmd];
  if (!load) {
    console.error(`hx: comando desconhecido: ${cmd}

${HELP}`);
    return 1;
  }
  const mod = await load();
  return mod.run(rest);
}
main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    logError(`hx ${process.argv.slice(2, 4).join(" ")}`, err);
    console.error(`hx: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
);
