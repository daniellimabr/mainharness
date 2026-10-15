// Project setup steps of /attach: templates, default lint, .claude/settings.json and plugins.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { readJson, writeJson } from "../core/fsx";
import { pluginRoot } from "../core/paths";
import { hasOtherLanguage } from "./classify";

export const PLUGINS = [
  "main-harness@harness-stable",
  "ponytail@ponytail",
  "security-guidance@claude-plugins-official",
];

const LINT_DEV_DEPS: Record<string, string> = {
  eslint: "^10.12.0",
  "@eslint/js": "^10.0.1",
  "typescript-eslint": "^8.71.2",
  globals: "^17.13.0",
  prettier: "^3.9.10",
  typescript: "^6.0.3",
};

export function templatePath(name: string): string {
  return path.join(pluginRoot(), "templates", name);
}

/** Renders a template replacing {{key}} placeholders. */
export function render(name: string, vars: Record<string, string>): string {
  return fs
    .readFileSync(templatePath(name), "utf8")
    .replace(/\{\{(\w+)\}\}/g, (m, k: string) => vars[k] ?? m);
}

/** Writes the file only when missing. Returns true when created. */
export function createIfMissing(file: string, content: string): boolean {
  if (fs.existsSync(file)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

/** Runs a fixed command line through the platform shell (npm/claude are .cmd shims on Windows). */
function runFixed(cwd: string, cmd: string, args: string[]) {
  if (cmd.endsWith(".js"))
    return spawnSync(process.execPath, [cmd, ...args], { cwd, encoding: "utf8" });
  if (process.platform === "win32")
    return spawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", [cmd, ...args].join(" ")],
      {
        cwd,
        encoding: "utf8",
        windowsHide: true,
      },
    );
  return spawnSync(cmd, args, { cwd, encoding: "utf8" });
}

const ESLINT_CONFIGS = /^(eslint\.config\.(js|mjs|cjs|ts|mts|cts)|\.eslintrc(\..+)?)$/;

/** Installs the default lint (section 9). Returns a short message for the summary. */
export function setupLint(root: string, install: boolean): string {
  const pkgFile = path.join(root, "package.json");
  const pkg = readJson<Record<string, unknown> | null>(pkgFile, null);
  if (fs.readdirSync(root).some((f) => ESLINT_CONFIGS.test(f)) || pkg?.eslintConfig)
    return "lint: o repo já tem ESLint; mantido.";
  if (!pkg && hasOtherLanguage(root))
    return "lint: projeto de outra linguagem; o lint padrão não se aplica.";
  const next: Record<string, unknown> = pkg ?? {
    name: path
      .basename(root)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-"),
    private: true,
  };
  const dev = { ...((next.devDependencies as Record<string, string>) ?? {}) };
  const deps = (next.dependencies as Record<string, string>) ?? {};
  for (const [k, v] of Object.entries(LINT_DEV_DEPS)) if (!dev[k] && !deps[k]) dev[k] = v;
  next.devDependencies = dev;
  writeJson(pkgFile, next);
  // ESM config saved as .mjs so it works whatever the package "type" is.
  for (const [src, dest] of [
    ["eslint.config.js", "eslint.config.mjs"],
    [".prettierrc", ".prettierrc"],
    ["tsconfig.json", "tsconfig.json"],
  ] as const)
    createIfMissing(path.join(root, dest), fs.readFileSync(templatePath(`lint/${src}`), "utf8"));
  if (!install) return "lint: ESLint + Prettier configurados (npm install pulado).";
  const r = runFixed(root, "npm", ["install"]);
  return r.status === 0
    ? "lint: ESLint + Prettier instalados."
    : "lint: configurado, mas o npm install falhou; rode npm install no repo.";
}

/** Merges the harness keys into .claude/settings.json, never removing existing keys. */
export function mergeSettings(root: string, contextLimit: number): void {
  const file = path.join(root, ".claude", "settings.json");
  const s = readJson<Record<string, unknown>>(file, {});
  const perms = (s.permissions as Record<string, unknown>) ?? {};
  const allow = (perms.allow as string[]) ?? [];
  for (const rule of ["Bash(hx *)", "PowerShell(hx *)"])
    if (!allow.includes(rule)) allow.push(rule);
  s.env = {
    ...((s.env as object) ?? {}),
    ENABLE_STOP_REVIEW: "0",
    ENABLE_COMMIT_REVIEW: "0",
  };
  s.autoCompactWindow = contextLimit;
  s.permissions = { ...perms, allow };
  writeJson(file, s);
}

/** Installs the plugins at project scope via the claude CLI; falls back to enabledPlugins. */
export function installPlugins(root: string): string {
  const bin = process.env.HARNESS_CLAUDE_BIN || "claude";
  const failed = PLUGINS.filter((id) => {
    const r = runFixed(root, bin, ["plugin", "install", id, "--scope", "project"]);
    return r.status !== 0;
  });
  if (!failed.length) return "plugins: instalados no projeto.";
  const file = path.join(root, ".claude", "settings.json");
  const s = readJson<Record<string, unknown>>(file, {});
  const enabled = { ...((s.enabledPlugins as Record<string, boolean>) ?? {}) };
  for (const id of failed) enabled[id] = true;
  s.enabledPlugins = enabled;
  writeJson(file, s);
  return `plugins: o comando claude falhou; ${failed.join(", ")} ligados direto no settings.`;
}

/** After a release: Claude Code caches the plugin per version, so each attached project needs an update. */
export function updatePlugins(roots: string[]): string {
  const bin = process.env.HARNESS_CLAUDE_BIN || "claude";
  const live = roots.filter((r) => fs.existsSync(r));
  const failed = live.filter(
    (r) =>
      runFixed(r, bin, ["plugin", "update", PLUGINS[0] as string, "--scope", "project"]).status !==
      0,
  );
  const ok = live.length - failed.length;
  return `- plugin atualizado em ${ok} projeto(s)${failed.length ? `; falhou em: ${failed.join(", ")}` : ""}.`;
}
