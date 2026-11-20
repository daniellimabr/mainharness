import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("harnessDash.open", () => {
      const panel = vscode.window.createWebviewPanel(
        "harnessDash",
        "Harness Dash",
        vscode.ViewColumn.Active,
        {},
      );
      panel.webview.html = "<!doctype html><html><body><h1>Harness Dash</h1></body></html>";
    }),
  );
}

export function deactivate(): void {}
