import * as vscode from "vscode";

/**
 * Get `editor.formatOnSave` setting from the settings.
 */
export function getJSONFormatOnSaveSetting(settingsJSON: any): boolean | undefined
{
    let result: boolean | undefined;
    const key = "editor.formatOnSave";
    if (settingsJSON)
    {
        result = settingsJSON["[json]"] && settingsJSON["[json]"][key];
        if (result == null)
        {
            result = settingsJSON["[jsonc]"] && settingsJSON["[jsonc]"][key];
        }

        if (result == null)
        {
            result = settingsJSON[key];
        }
    }
    return result;
}

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
