import * as vscode from "vscode";
import { buildStatus } from "./statusModel";
import { readProjects, readState, watchDashboard, type StateResult } from "./store";

export function createStatusBar(home: string): vscode.Disposable {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);

  const refresh = (): void => {
    const projects = readProjects(home);
    const states: Record<string, StateResult> = {};
    for (const p of projects) states[p.id] = readState(home, p.id);
    const folders = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
    const s = buildStatus(projects, states, folders);
    if (!s) return item.hide();
    item.text = s.text;
    item.tooltip = s.tooltip;
    item.command = s.command;
    item.show();
  };

  refresh();
  const stop = watchDashboard(home, refresh);
  const folders = vscode.workspace.onDidChangeWorkspaceFolders(refresh);
  return new vscode.Disposable(() => {
    stop();
    folders.dispose();
    item.dispose();
  });
}
