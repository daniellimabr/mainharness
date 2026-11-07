// hx shot <url|arquivo> [--out arquivo.png] [--width N] [--theme light|dark|both]: print com Chrome/Edge headless.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { flagStr, parseArgs } from "../core/args";

const PF = process.env.PROGRAMFILES ?? "C:\\Program Files";
const PF86 = process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)";
const CANDIDATES = [
  `${PF}\\Google\\Chrome\\Application\\chrome.exe`,
  `${PF86}\\Google\\Chrome\\Application\\chrome.exe`,
  `${PF86}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${PF}\\Microsoft\\Edge\\Application\\msedge.exe`,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
];

function findBrowser(): string | null {
  const env = process.env.HX_CHROME;
  if (env) return fs.existsSync(env) ? env : null;
  return CANDIDATES.find((c) => fs.existsSync(c)) ?? null;
}

export function run(args: string[]): number {
  const p = parseArgs(args);
  const input = p._[0];
  if (!input) {
    console.error(
      "uso: hx shot <url|arquivo> [--out arquivo.png] [--width N] [--theme light|dark|both]",
    );
    return 1;
  }
  const theme = flagStr(p, "theme") ?? "light";
  if (!["light", "dark", "both"].includes(theme)) {
    console.error("hx shot: --theme deve ser light, dark ou both.");
    return 1;
  }
  const width = Number(flagStr(p, "width") ?? 1280);
  if (!Number.isInteger(width) || width < 100) {
    console.error("hx shot: --width deve ser um número inteiro (mínimo 100).");
    return 1;
  }
  const browser = findBrowser();
  if (!browser) {
    console.error(
      "hx shot: Chrome/Edge não encontrado. Aponte o navegador com a variável HX_CHROME (caminho do chrome.exe ou msedge.exe).",
    );
    return 1;
  }

  const url = fs.existsSync(input) ? pathToFileURL(path.resolve(input)).href : input;
  const themes = theme === "both" ? ["light", "dark"] : [theme];
  const out = flagStr(p, "out");
  for (const t of themes) {
    let file = path.resolve(process.cwd(), ".harness", "shots", `shot-${t}.png`);
    if (out) {
      const o = path.resolve(out);
      const ext = path.extname(o) || ".png";
      file = themes.length > 1 ? `${o.slice(0, o.length - path.extname(o).length)}-${t}${ext}` : o;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // Own profile dir: an already-open browser would capture the headless run and hang.
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hx-shot-"));
    const flags = [
      "--headless",
      `--user-data-dir=${profile}`,
      "--disable-gpu",
      "--hide-scrollbars",
      `--screenshot=${file}`,
      `--window-size=${width},800`,
      ...(t === "dark" ? ["--force-dark-mode", "--blink-settings=preferredColorScheme=1"] : []),
      url,
    ];
    // HX_CHROME may be a .js script (the fake browser in tests): run it with node.
    const isJs = browser.endsWith(".js");
    const r = spawnSync(isJs ? process.execPath : browser, isJs ? [browser, ...flags] : flags, {
      encoding: "utf8",
      timeout: 60_000,
    });
    fs.rmSync(profile, { recursive: true, force: true });
    if (!fs.existsSync(file)) {
      console.error(
        `hx shot: o navegador não gerou ${file}. ${r.error?.message ?? r.stderr ?? ""}`.trim(),
      );
      return 1;
    }
    console.log(file);
  }
  return 0;
}
