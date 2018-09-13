import * as vscode from "vscode";

/**
 * Gets VSCode extension by its id.
 */
export function getExtensionById(id: string, ignoreCase = true)
{
    if (id != null)
    {
        if (ignoreCase)
        {
            const targetId = id.toLowerCase();
            return vscode.extensions.all.find((ext) =>
            {
                return ext.id.toLowerCase() === targetId;
            });
        }
        return vscode.extensions.getExtension(id);
    }
    return;
}

/**
 * Gets `editor.formatOnSave` setting from `VSCode User Settings`.
 */
export function getVSCodeSetting<T>(section: string, key: string, defaultValue?: T): T
{
    return vscode.workspace.getConfiguration(section).get<T>(key, defaultValue);
}

/**
 * Gets `editor.formatOnSave` setting from settings JSON.
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
 *
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
