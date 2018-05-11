import * as vscode from "vscode";

/**
 * Open file in the VSCode editor.
 * @param filepath The full path of file.
 */
export function openFile(filepath: string)
{
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(filepath));
}

/**
 * Reload VSCode window.
 */
export function reloadWindow()
{
    vscode.commands.executeCommand("workbench.action.reloadWindow");
}
