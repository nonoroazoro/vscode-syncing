import * as vscode from "vscode";

import { localize } from "../i18n";
import { NormalizedLocale } from "../types/NormalizedLocale";
import { VSCodeEdition } from "../types/VSCodeEdition";
import { normalize } from "./locale";

/**
 * Gets the VSCode extension by id.
 *
 * The id is `case-insensitive` by default.
 *
 */
export function getExtensionById(id: string, ignoreCase = true)
{
    if (id != null)
    {
        if (ignoreCase)
        {
            const targetId = id.toLocaleLowerCase();
            return vscode.extensions.all.find((ext) => (ext.id.toLocaleLowerCase() === targetId));
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
        return JSON.parse(process.env.VSCODE_NLS_CONFIG || "{}").locale;
    }
    catch (err)
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

        case "Code - OSS":
            return VSCodeEdition.OSS;
    }

    // if (vscode.extensions.getExtension("coder.coder"))
    // {
    //     return VSCodeEdition.CODER;
    // }
    throw new Error(localize("error.env.unknown.vscode"));
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
