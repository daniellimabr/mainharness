import * as crypto from "node:crypto";
import * as vscode from "vscode";
import { buildViewModel } from "./model";
import { defaultHome, readProjects, readState, watchDashboard } from "./store";

let current: vscode.WebviewPanel | undefined;

function snapshot(home: string) {
  return buildViewModel(
    readProjects(home).map((p) => ({ id: p.id, name: p.name, result: readState(home, p.id) })),
  );
}

export function openPanel(context: vscode.ExtensionContext): void {
  if (current) {
    current.reveal();
    return;
  }
  const media = vscode.Uri.joinPath(context.extensionUri, "media");
  const panel = vscode.window.createWebviewPanel(
    "harnessDash",
    "Harness Dash",
    vscode.ViewColumn.Active,
    { enableScripts: true, localResourceRoots: [media], retainContextWhenHidden: true },
  );
  current = panel;
  const web = panel.webview;
  const nonce = crypto.randomBytes(16).toString("base64");
  const css = web.asWebviewUri(vscode.Uri.joinPath(media, "panel.css"));
  const js = web.asWebviewUri(vscode.Uri.joinPath(media, "panel.js"));
  const csp = `default-src 'none'; style-src ${web.cspSource}; script-src 'nonce-${nonce}'`;
  web.html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${css}"><title>Harness Dash</title></head>
<body><main id="app"><p class="mute">Carregando...</p></main>
<script nonce="${nonce}" src="${js}"></script></body></html>`;

  const home = defaultHome();
  const push = (): void => {
    void web.postMessage({ type: "state", vm: snapshot(home) });
  };
  const stop = watchDashboard(home, push);
  // Webview announces itself when loaded; also re-push when it becomes visible again.
  web.onDidReceiveMessage((m: { type?: string }) => {
    if (m.type === "ready") push();
  });
  panel.onDidChangeViewState(() => {
    if (panel.visible) push();
  });
  panel.onDidDispose(() => {
    stop();
    current = undefined;
  });
}
