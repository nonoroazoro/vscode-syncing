import * as moment from "moment";
import * as vscode from "vscode";

import Gist from "./Gist";

/**
 * Set a message to the VSCode status bar.
 * @param message The message to show.
 * @param hideAfterTimeout Timeout in milliseconds after which the message will be cleared.
 */
function status(message: string, hideAfterTimeout?: number): void
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
 * Set an `info` message to the VSCode status bar and auto-hide after `4000` milliseconds.
 * @param message The message to show.
 */
function statusInfo(message: string): void
{
    status(message, 4000);
}

/**
 * Set an `error` message to the VSCode status bar and auto-hide after `8000` milliseconds.
 * @param message The message to show.
 */
function statusError(message: string): void
{
    status(message, 8000);
}

/**
 * Set an `fatal` message to the VSCode status bar and auto-hide after `12000` milliseconds.
 * @param message The message to show.
 */
function statusFatal(message: string): void
{
    status(message, 12000);
}

/**
 * Show GitHub Personal Access Token input box.
 * @param forUpload Whether to show messages for upload. Defaults to `true`.
 */
function showGitHubTokenInputBox(forUpload: boolean = true): Promise<{ token: string }>
{
    return new Promise((resolve, reject) =>
    {
        const placeHolder = forUpload ?
            "Enter GitHub Personal Access Token." :
            "Enter GitHub Personal Access Token (Leave it blank to download from a public Gist).";
        const options = {
            ignoreFocusOut: true,
            password: false,
            placeHolder,
            prompt: "Used for authenticating to your GitHub Gist."
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            if (value === undefined)
            {
                // Reject if cancelled.
                reject(new Error("You abort the synchronization."));
            }
            else
            {
                const token = value.trim();
                if (forUpload && !token)
                {
                    // Only reject when uploading.
                    reject(new Error("The GitHub Personal Access Token is not set."));
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
 * Show Gist ID input box.
 * @param forUpload Whether to show messages for upload. Defaults to `true`.
 */
function showGistInputBox(forUpload: boolean = true): Promise<{ id: string }>
{
    return new Promise((resolve, reject) =>
    {
        const placeHolder = forUpload ?
            "Enter Gist ID (Leave it blank to create a new Gist automatically)." :
            "Enter Gist ID.";
        const options = {
            ignoreFocusOut: true,
            password: false,
            placeHolder,
            prompt: "Used for synchronizing your settings with Gist."
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            if (value === undefined)
            {
                // Reject if cancelled.
                reject(new Error("You abort the synchronization."));
            }
            else
            {
                const id = value.trim();
                if (!forUpload && !id)
                {
                    // Only reject when downloading.
                    reject(new Error("The Gist ID is not set."));
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
 * Show remote Gist list box.
 * @param api GitHub Gist utils.
 * @param forUpload Whether to show messages for upload. Defaults to `true`.
 */
function showRemoteGistListBox(api: Gist, forUpload: boolean = true): Promise<{ id: string }>
{
    return new Promise((resolve, reject) =>
    {
        showSpinner("Syncing: Checking remote Gists.");
        return api.getAll()
            .then((gists: any[]) =>
            {
                clearSpinner("");

                const manualItem = {
                    data: "@@manual",
                    label: `Enter Gist ID manually...`
                };

                // Don't show quick pick dialog when gists is empty.
                if (gists && gists.length > 0)
                {
                    const items: any[] = gists.map((gist) => ({
                        data: gist.id,
                        description: `Last uploaded ${moment.duration(new Date(gist.updated_at).getTime() - Date.now()).humanize(true)}.`,
                        label: `Gist ID: ${gist.id}`
                    }));
                    items.unshift(manualItem);
                    return vscode.window.showQuickPick(items, {
                        ignoreFocusOut: true,
                        matchOnDescription: true,
                        placeHolder: `Choose a Gist to ${forUpload ? "upload" : "download"} your settings.`
                    });
                }
                else
                {
                    return manualItem;
                }
            })
            .then((item: { data: string }) =>
            {
                // Reject if cancelled.
                if (item)
                {
                    const id = item.data;
                    if (!forUpload && !id)
                    {
                        // Only reject when downloading.
                        reject(new Error("the Gist ID is not set."));
                    }
                    else
                    {
                        if (id === "@@manual")
                        {
                            resolve({ id: "" });
                        }
                        else
                        {
                            resolve({ id });
                        }
                    }
                }
                else
                {
                    reject(new Error("You abort the synchronization."));
                }
            })
            .catch(reject);
    });
}

/**
 * Show a "Reload VSCode" prompt dialog.
 */
function showReloadBox(): void
{
    const title: string = "Reload";
    const message: string = "Syncing: Settings are successfully synced. Reload VSCode to take effect.";
    vscode.window.showInformationMessage(message, { title }).then((btn) =>
    {
        if (btn && btn.title === title)
        {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });
}

let spinnerTimer: NodeJS.Timer | null;
const spinner = {
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    interval: 100
};

/**
 * Show a message with spinner and progress.
 * @param message Message to display after spinner.
 * @param progress Current progress.
 * @param total Total progress.
 */
function showSpinner(message: string, progress?: number, total?: number): void
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
 * Clear spinner and show message, do nothing if currently no spinner is exist.
 * @param message The message to show.
 */
function clearSpinner(message?: string): void
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

/**
 * VSCode message utils.
 */
export default {
    clearSpinner,
    showGistInputBox,
    showGitHubTokenInputBox,
    showReloadBox,
    showRemoteGistListBox,
    showSpinner,
    status,
    statusError,
    statusFatal,
    statusInfo
};
