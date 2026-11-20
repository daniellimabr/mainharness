import * as vscode from "vscode";
import { defaultHome } from "./store";
import { openPanel } from "./panel";
import { createStatusBar } from "./statusBar";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("harnessDash.open", () => openPanel(context)),
    createStatusBar(defaultHome()),
  );
}

export function deactivate(): void {}
