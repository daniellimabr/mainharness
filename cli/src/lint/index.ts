// Formats (prettier) and lints (eslint --fix) one file with the project's own tools, when present.
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";

/** ESLint flat config file names (eslint.config.{js,mjs,cjs,ts,mts,cts}). */
export const ESLINT_CONFIG = /^eslint\.config\.[cm]?[jt]s$/;
const MAX_LINES = 20;

interface Prettier {
  getFileInfo(
    file: string,
    opts: { ignorePath: string[] },
  ): Promise<{ ignored: boolean; inferredParser: string | null }>;
  resolveConfig(file: string): Promise<Record<string, unknown> | null>;
  format(src: string, opts: Record<string, unknown>): Promise<string>;
}

interface LintMessage {
  line?: number;
  column?: number;
  ruleId: string | null;
  message: string;
  severity: number;
}
interface LintResult {
  filePath: string;
  messages: LintMessage[];
}
interface ESLintCtor {
  new (opts: { cwd: string; fix: boolean }): {
    isPathIgnored(file: string): Promise<boolean>;
    lintFiles(files: string[]): Promise<LintResult[]>;
  };
  outputFixes(results: LintResult[]): Promise<void>;
}

function load<T>(req: NodeJS.Require, id: string): T | null {
  try {
    req.resolve(id);
  } catch {
    return null;
  }
  return req(id) as T;
}

async function format(req: NodeJS.Require, root: string, file: string): Promise<void> {
  const prettier = load<Prettier>(req, "prettier");
  if (!prettier) return;
  const ignorePath = [path.join(root, ".gitignore"), path.join(root, ".prettierignore")];
  const info = await prettier.getFileInfo(file, { ignorePath });
  if (info.ignored || !info.inferredParser) return;
  const src = fs.readFileSync(file, "utf8");
  const options = (await prettier.resolveConfig(file)) ?? {};
  const out = await prettier.format(src, { ...options, filepath: file });
  if (out !== src) fs.writeFileSync(file, out);
}

async function lint(req: NodeJS.Require, root: string, file: string): Promise<string[]> {
  if (!fs.readdirSync(root).some((f) => ESLINT_CONFIG.test(f))) return [];
  const mod = load<{ ESLint: ESLintCtor }>(req, "eslint");
  if (!mod) return [];
  const eslint = new mod.ESLint({ cwd: root, fix: true });
  if (await eslint.isPathIgnored(file)) return [];
  const results = await eslint.lintFiles([file]);
  await mod.ESLint.outputFixes(results);
  const rel = path.relative(root, file).split(path.sep).join("/");
  return results.flatMap((r) =>
    r.messages
      .filter((m) => m.severity > 0)
      .map((m) => `${rel}:${m.line ?? 0}:${m.column ?? 0} ${m.ruleId ?? "erro"} ${m.message}`),
  );
}

/**
 * Formats and lints `file` inside `root`. Returns the remaining problems as compact lines
 * (at most 20), or an empty list when clean or when the project has no eslint/prettier.
 */
export async function lintFile(root: string, file: string): Promise<string[]> {
  const pkg = path.join(root, "package.json");
  if (!fs.existsSync(pkg)) return [];
  const req = createRequire(pkg);
  try {
    await format(req, root, file);
  } catch {
    // syntax errors surface through eslint below
  }
  const lines = await lint(req, root, file);
  if (lines.length <= MAX_LINES) return lines;
  return [...lines.slice(0, MAX_LINES), `... e mais ${lines.length - MAX_LINES} problemas`];
}
