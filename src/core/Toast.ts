/**
 * VSCode message utils.
 */

import * as moment from "moment";
import * as vscode from "vscode";

import { localize } from "../i18n";
import * as GitHubTypes from "../types/GitHubTypes";
import { reloadWindow } from "../utils/vscodeAPI";
import { Gist } from "./Gist";

/**
 * Represents the item of GistListBox.
 */
interface IGistListBoxItem extends vscode.QuickPickItem
{
    /**
     * The payload of the item.
     */
    data: string;
}

/**
 * Displays a message to the VSCode status bar.
 *
 * @param message The message to show.
 * @param hideAfterTimeout Timeout in milliseconds after which the message will be cleared.
 */
export function status(message: string, hideAfterTimeout?: number): void
{
    clearSpinner();

    if (hideAfterTimeout)
    {
        vscode.window.setStatusBarMessage("");
        vscode.window.setStatusBarMessage(message, hideAfterTimeout);
    }
    else
    {
        vscode.window.setStatusBarMessage(message);
    }
}

/**
 * Displays an `info` message to the VSCode status bar and auto-hide after `4000` milliseconds.
 *
 * @param message The message to show.
 */
export function statusInfo(message: string): void
{
    status(message, 4000);
}

/**
 * Displays an `error` message to the VSCode status bar and auto-hide after `8000` milliseconds.
 *
 * @param message The message to show.
 */
export function statusError(message: string): void
{
    status(message, 8000);
}

/**
 * Displays an `fatal` message to the VSCode status bar and auto-hide after `12000` milliseconds.
 *
 * @param message The message to show.
 */
export function statusFatal(message: string): void
{
    status(message, 12000);
}

/**
 * Shows the GitHub Personal Access Token input box.
 *
 * @param forUpload Whether to show messages for upload. Defaults to `true`.
 */
export function showGitHubTokenInputBox(forUpload: boolean = true): Promise<{ token: string }>
{
    return new Promise((resolve, reject) =>
    {
        const placeHolder = forUpload
            ? localize("toast.box.enter.github.token.upload")
            : localize("toast.box.enter.github.token.download");
        const options = {
            ignoreFocusOut: true,
            password: false,
            placeHolder,
            prompt: localize("toast.box.enter.github.token.description")
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            if (value === undefined)
            {
                // Reject if cancelled.
                reject(new Error(localize("error.abort.synchronization")));
            }
            else
            {
                const token = value.trim();
                if (forUpload && !token)
                {
                    // Only reject when uploading.
                    reject(new Error(localize("error.no.github.token")));
                }
                else
                {
                    resolve({ token });
                }
            }
        });
    });
}

/**
 * Shows the Gist ID input box.
 *
 * @param forUpload Whether to show messages for upload. Defaults to `true`.
 */
export function showGistInputBox(forUpload: boolean = true): Promise<{ id: string }>
{
    return new Promise((resolve, reject) =>
    {
        const placeHolder = forUpload
            ? localize("toast.box.enter.gist.id.upload")
            : localize("toast.box.enter.gist.id.download");
        vscode.window.showInputBox({
            ignoreFocusOut: true,
            password: false,
            placeHolder,
            prompt: localize("toast.box.enter.gist.id.description")
        }).then((value) =>
        {
            if (value === undefined)
            {
                // Reject if cancelled.
                reject(new Error(localize("error.abort.synchronization")));
            }
            else
            {
                const id = value.trim();
                if (!forUpload && !id)
                {
                    // Only reject when downloading.
                    reject(new Error(localize("error.no.gist.id")));
                }
                else
                {
                    resolve({ id });
                }
            }
        });
    });
}

/**
 * Shows the remote Gist list box.
 *
 * @param api GitHub Gist utils.
 * @param forUpload Whether to show messages for upload. Defaults to `true`.
 */
export function showRemoteGistListBox(api: Gist, forUpload: boolean = true): Promise<{ id: string }>
{
    return new Promise((resolve, reject) =>
    {
        showSpinner(localize("toast.settings.checking.remote.gists"));
        return api.getAll()
            .then((gists: GitHubTypes.IGist[]) =>
            {
                clearSpinner("");

                const manualItem: IGistListBoxItem = {
                    data: "@@manual",
                    description: "",
                    label: localize("toast.box.enter.gist.id.manually")
                };

                // Show quick pick dialog only if the gists is not empty.
                if (gists.length > 0)
                {
                    const items: IGistListBoxItem[] = gists.map((gist) => ({
                        data: gist.id,
                        description: localize("toast.box.gist.last.uploaded", moment.duration(new Date(gist.updated_at).getTime() - Date.now()).humanize(true)),
                        label: `Gist ID: ${gist.id}`
                    }));
                    items.unshift(manualItem);
                    return vscode.window.showQuickPick(items, {
                        ignoreFocusOut: true,
                        matchOnDescription: true,
                        placeHolder: forUpload
                            ? localize("toast.box.choose.gist.upload")
                            : localize("toast.box.choose.gist.download")
                    });
                }
                return manualItem;
            })
            .then((item) =>
            {
                if (item)
                {
                    const { data: id } = item;
                    if (id === "@@manual")
                    {
                        resolve({ id: "" });
                    }
                    else
                    {
                        resolve({ id });
                    }
                }
                else
                {
                    // Reject if cancelled.
                    reject(new Error(localize("error.abort.synchronization")));
                }
            })
            .catch(reject);
    });
}

/**
 * Shows a `Reload VSCode` prompt dialog.
 */
export function showReloadBox(): void
{
    const reloadButton = localize("toast.box.reload");
    const message = localize("toast.box.reload.message");
    vscode.window.showInformationMessage(message, reloadButton).then((selection) =>
    {
        if (selection === reloadButton)
        {
            reloadWindow();
        }
    });
}

/**
 * Shows a confirm prompt dialog.
 */
export function showConfirmBox(message: string, ...buttons: string[])
{
    return vscode.window.showInformationMessage(message, ...buttons);
}

let spinnerTimer: NodeJS.Timer | null;
const spinner = {
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    interval: 100
};

/**
 * Displays a message with spinner and progress.
 *
 * @param message Message to display after spinner.
 * @param progress Current progress.
 * @param total Total progress.
 */
export function showSpinner(message: string, progress?: number, total?: number): void
{
    clearSpinner();

    let text = "";
    if (progress != null && total != null)
    {
        text = `[${progress}/${total}]`;
    }

    if (message != null)
    {
        text = text ? `${text} ${message}` : `${message}`;
    }

    if (text)
    {
        text = ` ${text.trim()}`;
    }

    let step: number = 0;
    const frames: string[] = spinner.frames;
    const length: number = frames.length;
    spinnerTimer = setInterval(() =>
    {
        vscode.window.setStatusBarMessage(`${frames[step]}${text}`);
        step = (step + 1) % length;
    }, spinner.interval);
}

/**
 * Clears the spinner and displays the message, do nothing if currently there's no any spinner.
 *
 * @param message The message to show.
 */
export function clearSpinner(message?: string): void
{
    if (spinnerTimer)
    {
        clearInterval(spinnerTimer);
        spinnerTimer = null;

        if (message != null)
        {
            vscode.window.setStatusBarMessage(message);
        }
    }
}
