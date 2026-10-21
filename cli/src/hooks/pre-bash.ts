// PreToolUse(Bash|PowerShell): denies destructive commands, asks before risky git operations.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { DEFAULT_CONFIG, loadConfig } from "../core/config";
import { isInside, samePathKey } from "../core/fsx";
import { resolveProject } from "../core/projects";
import { writeBlocked } from "./pre-edit";
import { jsonOut, type HookInput, type HookOutcome } from "./runner";

export interface Verdict {
  decision: "deny" | "ask";
  reason: string;
}

interface Segment {
  words: string[];
  redirects: string[];
}

/** Splits a shell line into segments (by ; && || | & newline parens) with quote-aware words. */
export function splitCommand(cmd: string): Segment[] {
  const segs: Segment[] = [];
  let seg: Segment = { words: [], redirects: [] };
  let word = "";
  let inWord = false;
  let quote: string | null = null;
  let next: "word" | "redirect" | "skip" = "word";
  const endWord = () => {
    if (inWord) {
      if (next === "redirect") seg.redirects.push(word);
      else if (next === "word") seg.words.push(word);
      next = "word";
    }
    word = "";
    inWord = false;
  };
  const endSeg = () => {
    endWord();
    if (seg.words.length || seg.redirects.length) segs.push(seg);
    seg = { words: [], redirects: [] };
    next = "word";
  };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i] as string;
    if (quote) {
      if (c === quote) quote = null;
      else word += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      inWord = true;
      continue;
    }
    if (c === " " || c === "\t") {
      endWord();
      continue;
    }
    if (c === "\n" || c === "\r" || c === ";" || c === "|" || c === "&") {
      endSeg();
      continue;
    }
    if ((c === "(" || c === ")") && !(c === "(" && word.endsWith("$"))) {
      endSeg();
      continue;
    }
    if (c === ">" || c === "<") {
      if (/^\d*$/.test(word) && inWord) {
        word = "";
        inWord = false;
      } else endWord();
      while (cmd[i + 1] === ">") i++;
      if (c === ">" && cmd[i + 1] === "|") i++; // >| (noclobber override)
      if (cmd[i + 1] === "&") {
        i++;
        // 2>&1 / >&- duplicate a descriptor; >&file writes to the file
        next = c === ">" && !/[\d-]/.test(cmd[i + 1] ?? "") ? "redirect" : "skip";
      } else next = c === ">" ? "redirect" : "skip";
      continue;
    }
    word += c;
    inWord = true;
  }
  endSeg();
  return segs;
}

/** Command name without directory, extension and case. Bash drops escapes in a bare name (r\m = rm). */
function baseName(w: string): string {
  const unescaped = w.replace(/\\(.)/g, "$1");
  if (!/[/:]/.test(unescaped) && !w.startsWith(".")) w = unescaped;
  return path
    .basename(w.replace(/\\/g, "/"))
    .replace(/\.exe$/i, "")
    .toLowerCase();
}

/** Variables assigned earlier in the command line being classified (X=...; rm -rf "$X"). */
let shellVars = new Map<string, string>();

/** Expands ~, variables (assignments in the command, then the environment) and Git Bash drives; null if unknown. */
function expandPath(t: string, cwd: string): string | null {
  const h = os.homedir();
  let p = t
    .replace(/^~(?=$|[\\/])/, h)
    .replace(/^(\$HOME|\$\{HOME\}|\$env:USERPROFILE|\$env:HOME|%USERPROFILE%|%HOMEPATH%)/i, h)
    .replace(
      /\$\{(\w+)\}|\$env:(\w+)|\$(\w+)|%(\w+)%/gi,
      (m, a?: string, b?: string, c?: string, d?: string) => {
        const name = (a ?? b ?? c ?? d) as string;
        return shellVars.get(name) ?? process.env[name] ?? m;
      },
    );
  if (/[$%]/.test(p)) return null;
  const drive = /^\/(?:cygdrive\/|mnt\/)?([a-zA-Z])(\/.*)?$/.exec(p);
  if (process.platform === "win32" && drive) p = `${drive[1]}:${drive[2] ?? "/"}`;
  if (/^[a-zA-Z]:$/.test(p)) p += "\\";
  return path.resolve(cwd, p);
}

const RECURSIVE_DELETE = new Set(["rm", "remove-item", "ri", "del", "erase", "rd", "rmdir"]);

function recursiveTargets(cmd: string, args: string[]): string[] | null {
  if (!RECURSIVE_DELETE.has(cmd)) return null;
  args = args.map((a) => a.replace(/^-(literal)?path:/i, "")); // -Path:C:\x
  const isPs = (a: string) => /^-r(e(c(u(r(s(e)?)?)?)?)?)?(:.*)?$/i.test(a);
  const isUnix = (a: string) => a === "--recursive" || (/^-[rRfivdI]+$/.test(a) && /[rR]/.test(a));
  const isCmd = (a: string) => /^\/s$/i.test(a);
  const recursive = args.some((a) =>
    cmd === "rm"
      ? isUnix(a) || isPs(a)
      : cmd === "remove-item" || cmd === "ri"
        ? isPs(a)
        : isCmd(a) || isPs(a),
  );
  if (!recursive) return null;
  return args.filter((a) => !a.startsWith("-") && !/^\/[a-zA-Z]$/.test(a));
}

/** Claude Code scratch area in the system temp folder (short and long form on Windows). */
function tempRoots(): string[] {
  const t = path.join(os.tmpdir(), "claude");
  try {
    return [t, fs.realpathSync.native(t)];
  } catch {
    return [t];
  }
}

function checkDeleteTarget(t: string, cwd: string, root: string): Verdict | null {
  const abs = expandPath(t, cwd);
  if (abs === null)
    return { decision: "ask", reason: `Apagar recursivamente "${t}": alvo não verificável.` };
  if (abs.split(/[\\/]/).includes(".git"))
    return { decision: "deny", reason: `Bloqueado: apagar a pasta .git ("${t}").` };
  if (tempRoots().some((r) => samePathKey(abs) !== samePathKey(r) && isInside(abs, r))) return null;
  if (samePathKey(abs) === samePathKey(root) || !isInside(abs, root))
    return { decision: "deny", reason: `Bloqueado: apagar "${t}" fora da pasta do projeto.` };
  return null;
}

const GIT_WRITES = new Set([
  "commit",
  "merge",
  "reset",
  "checkout",
  "add",
  "push",
  "pull",
  "rebase",
  "rm",
  "mv",
  "clean",
  "restore",
  "switch",
  "tag",
  "stash",
  "cherry-pick",
  "revert",
  "apply",
  "am",
]);

const FILE_WRITERS = new Set([
  "cp",
  "copy",
  "copy-item",
  "cpi",
  "mv",
  "move",
  "move-item",
  "mi",
  "rm",
  "del",
  "erase",
  "remove-item",
  "ri",
  "rd",
  "rmdir",
  "mkdir",
  "md",
  "new-item",
  "ni",
  "touch",
  "tee",
  "tee-object",
  "out-file",
  "set-content",
  "sc",
  "add-content",
  "ac",
  "rename-item",
  "ren",
  "robocopy",
  "xcopy",
  "rsync",
  "ln",
  "chmod",
]);

/** Reads the current branch from .git/HEAD (cheap, no git spawn). */
function currentBranch(dir: string): string | null {
  let cur = dir;
  for (;;) {
    const dotGit = path.join(cur, ".git");
    try {
      let gitDir = dotGit;
      if (fs.statSync(dotGit).isFile()) {
        const m = /gitdir:\s*(.+)/.exec(fs.readFileSync(dotGit, "utf8"));
        if (!m?.[1]) return null;
        gitDir = path.resolve(cur, m[1].trim());
      }
      const head = fs.readFileSync(path.join(gitDir, "HEAD"), "utf8");
      return /^ref: refs\/heads\/(.+)$/m.exec(head)?.[1]?.trim() ?? null;
    } catch {
      const up = path.dirname(cur);
      if (up === cur) return null;
      cur = up;
    }
  }
}

/** Writing to `t` follows the pre-edit rule (stable dir, cli/dist/hx.js). Unknown variables pass. */
function checkWrite(t: string, dir: string, root: string, stable: string): Verdict | null {
  const abs = expandPath(t, dir);
  const reason = abs === null ? null : writeBlocked(abs, root, stable);
  return reason ? { decision: "deny", reason } : null;
}

function checkGit(args: string[], cwd: string, root: string, stable: string): Verdict | null {
  let dir = cwd;
  let i = 0;
  while (i < args.length && (args[i] as string).startsWith("-")) {
    const a = args[i] as string;
    if (a === "-C") dir = expandPath(args[++i] ?? ".", dir) ?? dir;
    else if (a === "-c" || a === "--git-dir" || a === "--work-tree" || a === "--namespace") i++;
    i++;
  }
  const sub = args[i] ?? "";
  const rest = args.slice(i + 1);
  if (GIT_WRITES.has(sub) && isInside(dir, stable))
    return { decision: "deny", reason: `Bloqueado: ${stable} só muda via hx release/rollback.` };
  for (let k = 0; k < rest.length; k++) {
    // git diff/log/show --output=<file> (git accepts the abbreviation --outp)
    const a = rest[k] as string;
    const m =
      /^--outp(?:ut?)?(?:=(.*))?$/s.exec(a) ??
      (sub === "format-patch" ? /^(?:-o|--output-d[a-z]*=?)(.+)?$/s.exec(a) : null);
    const w = m && checkWrite(m[1] ?? rest[++k] ?? "", dir, root, stable);
    if (w) return w;
  }
  if (sub === "push") {
    if (rest.some((a) => a.startsWith("--force") || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a)))
      return { decision: "deny", reason: "Bloqueado: git push forçado." };
    const pos: string[] = [];
    for (let k = 0; k < rest.length; k++) {
      const a = rest[k] as string;
      if (a === "--repo" || a === "-o" || a === "--push-option" || a === "--receive-pack") k++;
      else if (!a.startsWith("-")) pos.push(a);
    }
    if (pos.some((r) => r.startsWith("+")))
      return { decision: "deny", reason: "Bloqueado: git push forçado (+refspec)." };
    if (rest.includes("--tags") && pos.length < 2) return null;
    const refs = pos.slice(1);
    const dests = refs.length
      ? refs.map((r) => {
          const d = r.includes(":") ? r.slice(r.indexOf(":") + 1) : r;
          return d === "HEAD" ? currentBranch(dir) : d.replace(/^refs\/heads\//, "");
        })
      : [currentBranch(dir)];
    const bad = dests.filter((d) => d !== "main");
    const all = rest.some((a) => a === "--all" || a === "--mirror");
    if (bad.length || all) {
      const label = bad[0] ?? (all ? "todas as branches" : "branch desconhecida");
      return { decision: "ask", reason: `git push para "${label}" (não é a main): confirme.` };
    }
    return null;
  }
  if (sub === "branch" && rest.includes("-D") && rest.some((a) => a === "main" || a === "master"))
    return { decision: "deny", reason: "Bloqueado: apagar a branch main/master." };
  if (sub === "reset" && rest.includes("--hard"))
    return { decision: "ask", reason: "git reset --hard descarta alterações: confirme." };
  if (sub === "clean" && rest.some((a) => a === "--force" || /^-[a-zA-Z]*f/.test(a)))
    return { decision: "ask", reason: "git clean apaga arquivos não versionados: confirme." };
  if ((sub === "checkout" || sub === "restore") && rest.includes("."))
    return { decision: "ask", reason: `git ${sub} . descarta alterações: confirme.` };
  if (sub === "rebase")
    return { decision: "ask", reason: "git rebase reescreve histórico: confirme." };
  if (sub === "commit" && staleBundle(dir))
    return { decision: "ask", reason: "bundle desatualizado: rode npm run build." };
  return null;
}

/** True when cli/src is staged and cli/dist/hx.js is older than the newest cli/src file. */
function staleBundle(dir: string): boolean {
  const git = (...a: string[]) =>
    spawnSync("git", ["-C", dir, ...a], { encoding: "utf8" }).stdout?.trim() ?? "";
  const top = git("rev-parse", "--show-toplevel");
  if (!top) return false;
  const src = path.join(top, "cli", "src");
  let bundle: number;
  try {
    bundle = fs.statSync(path.join(top, "cli", "dist", "hx.js")).mtimeMs;
  } catch {
    return false;
  }
  const staged = git("diff", "--cached", "--name-only").split("\n");
  if (!staged.some((f) => f.startsWith("cli/src/"))) return false;
  return fs
    .readdirSync(src, { recursive: true, encoding: "utf8" })
    .some((f) => fs.statSync(path.join(src, f)).mtimeMs > bundle);
}

const COPIERS = new Set(["cp", "copy", "copy-item", "cpi", "robocopy", "xcopy", "rsync", "ln"]);
const WRAPPERS = new Set(["sudo", "env", "command", "exec", "time", "nohup", "call"]);
const UNCHECKABLE: Verdict = { decision: "ask", reason: "Comando não verificável: confirme." };
// PowerShell accepts any unambiguous prefix of a parameter name.
const PS_VALUE_OPTS = /^-(ex[a-z]*|ep|w[a-z]*|v[a-z]*|in[a-z]*|o[a-z]*|conf[a-z]*|wd)$/i;
const PS_COMMAND = /^-c(o(m(m(a(n(d)?)?)?)?)?)?$/i;

/** The command line a shell will run (-c / -Command / bare args / /c), UNCHECKABLE, or null. */
function innerCommand(cmd: string, args: string[]): string | Verdict | null {
  if (cmd === "cmd") {
    const k = args.findIndex((a) => /^\/[ck]$/i.test(a));
    return k >= 0 ? args.slice(k + 1).join(" ") : null;
  }
  if (cmd === "bash" || cmd === "sh" || cmd === "zsh") {
    const k = args.findIndex((a) => /^-[a-z]*c$/.test(a));
    return k >= 0 ? args.slice(k + 1).join(" ") : null;
  }
  if (cmd !== "powershell" && cmd !== "pwsh") return null;
  const c = args.findIndex((a) => PS_COMMAND.test(a));
  for (let k = 0; k < args.length; k++) {
    const a = args[k] as string;
    if (/^-(e|ec|en[a-z]*)$/i.test(a)) return UNCHECKABLE; // -EncodedCommand
    if (k === c) return args.slice(k + 1).join(" ");
    if (/^-f(i(l(e)?)?)?$/i.test(a)) return null; // runs a script file
    if (PS_VALUE_OPTS.test(a)) k++;
    else if (!a.startsWith("-")) return args.slice(c > k ? c + 1 : k).join(" "); // bare args = -Command
  }
  return null;
}

/** Classifies a full command line. Returns null when it may run normally. */
export function classifyCommand(
  command: string,
  cwd: string,
  root: string,
  stable: string,
  vars = new Map<string, string>(),
): Verdict | null {
  shellVars = vars;
  let dir = cwd;
  let ask: Verdict | null = null;
  for (const seg of splitCommand(command)) {
    let words = seg.words;
    while (
      words.length &&
      (/^[A-Za-z_]\w*=/.test(words[0] as string) ||
        WRAPPERS.has(baseName(words[0] as string)) ||
        words[0] === "export")
    ) {
      const m = /^([A-Za-z_]\w*)=(.*)$/s.exec(words[0] as string);
      if (m && words.length === 1) vars.set(m[1] as string, m[2] as string); // plain assignment
      words = words.slice(1);
    }
    const cmd = baseName(words[0] ?? "");
    const args = words.slice(1);
    let v: Verdict | null = null;

    for (const r of seg.redirects) v ??= checkWrite(r, dir, root, stable);
    if (!v) {
      const inner =
        cmd === "hx" && args[0] === "run" ? args.slice(1).join(" ") : innerCommand(cmd, args);
      v = typeof inner === "string" ? classifyCommand(inner, dir, root, stable, vars) : inner;
    }
    if (!v && cmd === "xargs") {
      if (args.some((a) => RECURSIVE_DELETE.has(baseName(a)))) v = UNCHECKABLE;
    }
    if (
      !v &&
      cmd === "find" &&
      args.some(
        (a, i) =>
          a === "-delete" ||
          ((a === "-exec" || a === "-execdir") &&
            RECURSIVE_DELETE.has(baseName(args[i + 1] ?? ""))),
      )
    ) {
      const k = args.findIndex((a) => a.startsWith("-"));
      for (const t of (k < 0 ? args : args.slice(0, k)).concat(k === 0 ? ["."] : [])) {
        // find deletes what it matches, not the search root itself: the root is fine
        const abs = expandPath(t, dir);
        const r =
          abs && samePathKey(abs) === samePathKey(root) ? null : checkDeleteTarget(t, dir, root);
        if (r && (!v || r.decision === "deny")) v = r;
      }
    }
    if (!v && ["cd", "set-location", "sl", "chdir", "pushd"].includes(cmd)) {
      const target = args.find((a) => !a.startsWith("-") && !/^\/d$/i.test(a));
      if (target && /^\/(?:mnt\/|cygdrive\/)?[a-zA-Z]\//.test(target))
        return {
          decision: "deny",
          reason: `Bloqueado: cd "${target}": use caminho relativo ou as ferramentas Read/Grep/Edit; o cwd já é o projeto.`,
        };
      dir = (target === undefined ? os.homedir() : expandPath(target, dir)) ?? dir;
    }
    if (!v && cmd === "git") v = checkGit(args, dir, root, stable);
    if (!v) {
      const targets = recursiveTargets(cmd, args);
      if (targets?.length === 0 && cmd !== "rm") v = UNCHECKABLE; // target from the pipeline
      for (const t of targets ?? []) {
        const r = checkDeleteTarget(t, dir, root);
        if (r && (!v || r.decision === "deny")) v = r;
      }
    }
    if (!v && cmd === "format" && args.some((a) => /^[a-zA-Z]:\\?$/.test(a)))
      v = { decision: "deny", reason: "Bloqueado: formatar disco." };
    if (!v && (cmd === "mkfs" || cmd.startsWith("mkfs.")))
      v = { decision: "deny", reason: "Bloqueado: formatar disco (mkfs)." };
    if (!v && cmd === "dd" && args.some((a) => a.startsWith("of=/dev/")))
      v = { decision: "deny", reason: "Bloqueado: dd escrevendo em dispositivo." };
    if (!v && FILE_WRITERS.has(cmd)) {
      const pos = args
        .map((a) => a.replace(/^-(file|literal)?path:/i, "")) // -FilePath:x
        .filter((a) => !a.startsWith("-") && !/^\/[a-zA-Z]$/.test(a));
      const checked = COPIERS.has(cmd) ? pos.slice(cmd === "robocopy" ? 1 : -1).slice(0, 1) : pos;
      for (const a of checked) v ??= checkWrite(a, dir, root, stable);
      if (isInside(dir, stable))
        v = { decision: "deny", reason: `Bloqueado: ${stable} só muda via hx release/rollback.` };
    }
    if (v?.decision === "deny") return v;
    if (v && !ask) ask = v;
  }
  return ask;
}

export function preBash(input: HookInput): HookOutcome {
  const command = input.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) return {};
  const cwd = input.cwd || process.cwd();
  let root = cwd;
  let stable = DEFAULT_CONFIG.stableDir;
  try {
    root = resolveProject(cwd)?.root ?? cwd;
    stable = loadConfig().stableDir;
  } catch {
    // invalid HARNESS_HOME: fall back to defaults and keep guarding (never fail open)
  }
  const v = classifyCommand(command, cwd, root, stable);
  if (!v) return {};
  return jsonOut({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: v.decision,
      permissionDecisionReason: v.reason,
    },
  });
}
