// PreToolUse(Bash|PowerShell): denies destructive commands, asks before risky git operations.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadConfig } from "../core/config";
import { isInside, samePathKey } from "../core/fsx";
import { resolveProject } from "../core/projects";
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
      if (cmd[i + 1] === "&") {
        i++;
        next = "skip"; // fd duplication like 2>&1
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

/** Expands home-like variables and Git Bash drive paths; returns null for unknown variables. */
function expandPath(t: string, cwd: string): string | null {
  const h = os.homedir();
  let p = t
    .replace(/^~(?=$|[\\/])/, h)
    .replace(/^(\$HOME|\$\{HOME\}|\$env:USERPROFILE|\$env:HOME|%USERPROFILE%|%HOMEPATH%)/i, h);
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

function checkDeleteTarget(t: string, cwd: string, root: string): Verdict | null {
  const abs = expandPath(t, cwd);
  if (abs === null)
    return { decision: "ask", reason: `Apagar recursivamente "${t}": alvo não verificável.` };
  if (abs.split(/[\\/]/).includes(".git"))
    return { decision: "deny", reason: `Bloqueado: apagar a pasta .git ("${t}").` };
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

function checkGit(args: string[], cwd: string, stable: string): Verdict | null {
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
  return null;
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
): Verdict | null {
  let dir = cwd;
  let ask: Verdict | null = null;
  for (const seg of splitCommand(command)) {
    let words = seg.words;
    while (
      words.length &&
      (/^[A-Za-z_]\w*=/.test(words[0] as string) || WRAPPERS.has(baseName(words[0] as string)))
    )
      words = words.slice(1);
    const cmd = baseName(words[0] ?? "");
    const args = words.slice(1);
    let v: Verdict | null = null;

    for (const r of seg.redirects) {
      const abs = expandPath(r, dir);
      if (abs && isInside(abs, stable))
        v = { decision: "deny", reason: `Bloqueado: ${stable} só muda via hx release/rollback.` };
    }
    if (!v) {
      const inner =
        cmd === "hx" && args[0] === "run" ? args.slice(1).join(" ") : innerCommand(cmd, args);
      v = typeof inner === "string" ? classifyCommand(inner, dir, root, stable) : inner;
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
      dir = (target === undefined ? os.homedir() : expandPath(target, dir)) ?? dir;
    }
    if (!v && cmd === "git") v = checkGit(args, dir, stable);
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
      const pos = args.filter((a) => !a.startsWith("-") && !/^\/[a-zA-Z]$/.test(a));
      const checked = COPIERS.has(cmd) ? pos.slice(cmd === "robocopy" ? 1 : -1).slice(0, 1) : pos;
      const hit = checked.some((a) => {
        const abs = expandPath(a, dir);
        return abs !== null && isInside(abs, stable);
      });
      if (hit || isInside(dir, stable))
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
  const root = resolveProject(cwd)?.root ?? cwd;
  const v = classifyCommand(command, cwd, root, loadConfig().stableDir);
  if (!v) return {};
  return jsonOut({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: v.decision,
      permissionDecisionReason: v.reason,
    },
  });
}
