import * as vscode from "vscode";

import { VSCODE_BUILTIN_ENVIRONMENTS } from "../constants";
import { localize } from "../i18n";
import { VSCodeEdition } from "../types";
import type { NormalizedLocale } from "../types";
import { normalize } from "./locale";

/**
 * Gets the VSCode extension by id.
 *
 * The id is `case-insensitive` by default.
 */
export function getExtensionById(id: string, ignoreCase = true)
{
    if (id != null)
    {
        if (ignoreCase)
        {
            const targetId = id.toLocaleLowerCase();
            return vscode.extensions.all.find(ext => (ext.id.toLocaleLowerCase() === targetId));
        }
        return vscode.extensions.getExtension(id);
    }
    return;
}

/**
 * Gets the setting from `VSCode User Settings`.
 */
export function getVSCodeSetting<T>(section: string, key: string, defaultValue?: T): T
{
    return vscode.workspace.getConfiguration(section).get<T>(key, defaultValue as T);
}

/**
 * Gets the `editor.formatOnSave` setting from settings JSON.
 */
export function getJSONFormatOnSaveSetting(settingsJSON: JSONObject): boolean | undefined
{
    let result: boolean | undefined;
    if (settingsJSON)
    {
        const key = "editor.formatOnSave";
        result = (settingsJSON["[json]"] as Record<string, boolean>)?.[key]
            ?? (settingsJSON["[jsonc]"] as Record<string, boolean>)?.[key]
            ?? settingsJSON[key] as boolean;
    }
    return result;
}

/**
 * Gets the normalized VSCode locale.
 */
export function getNormalizedVSCodeLocale(): NormalizedLocale
{
    return normalize(getVSCodeLocale());
}

/**
 * Gets the VSCode locale string.
 */
export function getVSCodeLocale(): string | undefined
{
    try
    {
        return (JSON.parse(process.env.VSCODE_NLS_CONFIG ?? "{}") as { locale?: string; }).locale;
    }
    catch
    {
        return;
    }
}

/**
 * Gets the edition of the current running VSCode.
 *
 * @throws {Error} Throws an error when the edition is unknown.
 */
export function getVSCodeEdition()
{
    switch (vscode.env.appName)
    {
        case "Visual Studio Code":
            return VSCodeEdition.STANDARD;

        case "Visual Studio Code - Insiders":
            return VSCodeEdition.INSIDERS;

        case "Visual Studio Code - Exploration":
            return VSCodeEdition.EXPLORATION;

        case "VSCodium":
            return VSCodeEdition.VSCODIUM;

        case "VSCodium - Insiders":
            return VSCodeEdition.VSCODIUM_INSIDERS;

        case "Code - OSS":
            return VSCodeEdition.OSS;

        case "code-server":
            return VSCodeEdition.CODESERVER;

        case "Cursor":
            return VSCodeEdition.CURSOR;

        case "WindSurf":
            return VSCodeEdition.WINDSURF;

        case "Trae":
            return VSCodeEdition.TRAE;

        case "Trae CN":
            return VSCodeEdition.TRAE_CN;

        default:
            throw new Error(localize("error.env.unknown.vscode", vscode.env.appName));
    }
}

/**
 * Gets the builtin-environment of the current running VSCode.
 *
 * @throws {Error} Throws an error when the environment is not found.
 */
export function getVSCodeBuiltinEnvironment()
{
    return VSCODE_BUILTIN_ENVIRONMENTS[getVSCodeEdition()];
}

/**
 * Opens the file in a VSCode editor.
 *
 * @param filepath The full path of the file.
 */
export function openFile(filepath: string)
{
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(filepath));
}

/**
 * Reloads the VSCode window.
 */
export function reloadWindow()
{
    vscode.commands.executeCommand("workbench.action.reloadWindow");
}

/**
 * Register extension command on VSCode.
 */
export function registerCommand(context: vscode.ExtensionContext, command: string, callback: () => void)
{
    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(vscode.commands.registerCommand(command, callback));
}
