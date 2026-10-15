// Repo map (index.md): one line per file with its purpose, kept up to date by the post-edit hook.
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { writeFileAtomic } from "../core/fsx";

const SECTION = "## Arquivos";
const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);
const NO_PURPOSE = "(sem descrição)";

/** True when a repo-relative path (with /) lies in node_modules, dist or .git. */
export function isSkipped(rel: string): boolean {
  return rel.split("/").some((p) => SKIP_DIRS.has(p));
}

function clean(s: string): string {
  const t = s
    .replace(/\*\/\s*$/, "")
    .replace(/-->\s*$/, "")
    .trim();
  return t.length > 120 ? `${t.slice(0, 117)}...` : t;
}

/** Purpose of a file: top comment, frontmatter description, markdown title, or a placeholder. */
export function describeFile(file: string): string {
  let text: string;
  try {
    const fd = fs.openSync(file, "r");
    const buf = Buffer.alloc(4096);
    const n = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    text = buf.subarray(0, n).toString("utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  } catch {
    return NO_PURPOSE;
  }
  const lines = text.split(/\r?\n/);
  const isMd = /\.(md|mdx|markdown)$/i.test(file);
  if (lines[0]?.trim() === "---") {
    const end = lines.indexOf("---", 1);
    for (const l of lines.slice(1, end > 0 ? end : undefined)) {
      const m = /^description:\s*(.+)$/.exec(l);
      if (m?.[1]) return clean(m[1].replace(/^["']|["']$/g, "")) || NO_PURPOSE;
    }
    if (end > 0) lines.splice(0, end + 1);
  }
  let i = 0;
  if (lines[0]?.startsWith("#!")) i++;
  while (i < lines.length && !(lines[i] as string).trim()) i++;
  const first = (lines[i] ?? "").trim();
  const next = (lines[i + 1] ?? "").trim().replace(/^\*\s?/, "");
  let purpose = "";
  if (first.startsWith("//")) purpose = first.replace(/^\/+/, "");
  else if (first.startsWith("/*")) purpose = first.replace(/^\/\*+/, "").trim() || next;
  else if (first.startsWith("<!--"))
    purpose =
      first
        .slice(4)
        .replace(/-->.*$/, "")
        .trim() || next;
  else if (first.startsWith("#") && !isMd) purpose = first.replace(/^#+/, "");
  if (!purpose && isMd) purpose = lines.find((l) => /^#\s/.test(l))?.replace(/^#\s+/, "") ?? "";
  return clean(purpose) || NO_PURPOSE;
}

function entryPath(line: string): string | null {
  return /^- `([^`]+)`/.exec(line)?.[1] ?? null;
}

function entryLine(root: string, rel: string): string {
  return `- \`${rel}\` — ${describeFile(path.join(root, rel))}`;
}

/** Adds `file` to <root>/index.md (section "## Arquivos", sorted) when not listed. Returns true when added. */
export function ensureIndexEntry(root: string, file: string): boolean {
  const idx = path.join(root, "index.md");
  if (!fs.existsSync(idx)) return false;
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (!rel || rel.startsWith("..") || rel === "index.md" || isSkipped(rel)) return false;
  const eol = fs.readFileSync(idx, "utf8").includes("\r\n") ? "\r\n" : "\n";
  const lines = fs.readFileSync(idx, "utf8").split(/\r?\n/);
  if (lines.some((l) => entryPath(l) === rel)) return false;
  const line = entryLine(root, rel);
  const head = lines.findIndex((l) => l.trim() === SECTION);
  if (head < 0) {
    while (lines.length && !(lines[lines.length - 1] as string).trim()) lines.pop();
    lines.push("", SECTION, "", line, "");
  } else {
    let end = lines.findIndex((l, k) => k > head && l.startsWith("## "));
    if (end < 0) end = lines.length;
    let at = -1;
    let last = head + 1;
    for (let k = head + 1; k < end; k++) {
      const p = entryPath(lines[k] as string);
      if (p === null) continue;
      last = k + 1;
      if (at < 0 && p > rel) at = k;
    }
    if (at < 0) at = last;
    if (at === head + 1) lines.splice(at, 0, "", line);
    else lines.splice(at, 0, line);
  }
  writeFileAtomic(idx, lines.join(eol));
  return true;
}

function listFiles(root: string): string[] {
  if (fs.existsSync(path.join(root, ".git"))) {
    try {
      const out = execFileSync(
        "git",
        ["-C", root, "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 },
      );
      return [...new Set(out.split("\0").filter(Boolean))];
    } catch {
      // fall back to walking the folder
    }
  }
  const out: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const rel = prefix + e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}/`);
      else if (e.isFile()) out.push(rel);
    }
  };
  walk(root, "");
  return out;
}

/** Builds a full index.md for `root` (git ls-files when it is a repo, else a folder walk). */
export function buildRepoMap(root: string): string {
  const files = listFiles(root)
    .filter((f) => f !== "index.md" && !isSkipped(f) && fs.existsSync(path.join(root, f)))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [
    "# Mapa do repo",
    "",
    "Uma linha por arquivo: caminho e propósito. Mantido pelo hook `post-edit`.",
    "",
    SECTION,
    "",
    ...files.map((f) => entryLine(root, f)),
    "",
  ].join("\n");
}

/** Short summary of index.md for session context: file count and "##" headings. */
export function summarizeIndex(root: string, max = 1500): string | null {
  let text: string;
  try {
    text = fs.readFileSync(path.join(root, "index.md"), "utf8");
  } catch {
    return null;
  }
  const lines = text.split(/\r?\n/);
  const count = lines.filter((l) => entryPath(l) !== null).length;
  const heads = lines.filter((l) => l.startsWith("## ")).map((l) => l.slice(3).trim());
  const s = `Mapa do repo (index.md): ${count} arquivos. Seções: ${heads.join("; ") || "nenhuma"}.`;
  return s.length > max ? `${s.slice(0, max - 3)}...` : s;
}
