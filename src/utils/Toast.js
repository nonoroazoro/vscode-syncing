/**
 * vscode message utils.
 */

const moment = require("moment");
const vscode = require("vscode");

/**
 * toast message in vscode status bar. auto-clear the message when `p_time` is set.
 * @param {String} p_message message to show.
 * @param {Number} p_time clear after time.
 */
function status(p_message, p_time)
{
    clearSpinner();

    if (p_time)
    {
        vscode.window.setStatusBarMessage("");
        vscode.window.setStatusBarMessage(p_message, p_time);
    }
    else
    {
        vscode.window.setStatusBarMessage(p_message);
    }
}

/**
 * toast `info` message in vscode status bar (auto-hide).
 * @param {String} p_message
 */
function statusInfo(p_message)
{
    status(p_message, 4000);
}

/**
 * toast `error` message in vscode status bar (auto-hide).
 * @param {String} p_message
 */
function statusError(p_message)
{
    status(p_message, 8000);
}

/**
 * toast `fatal` message in vscode status bar (auto-hide).
 * @param {String} p_message
 */
function statusFatal(p_message)
{
    status(p_message, 12000);
}

/**
 * show GitHub Personal Access Token box.
 * @param {Boolean} [p_forUpload=true] default is true, show uploading message, else show downloading message.
 * @returns {Promise}
 */
function showGitHubTokenInputBox(p_forUpload = true)
{
    return new Promise((p_resolve, p_reject) =>
    {
        const placeHolder = p_forUpload ?
            "Enter GitHub Personal Access Token." :
            "Enter GitHub Personal Access Token (Leave it blank to download from a public Gist).";
        const options = {
            placeHolder: placeHolder,
            password: false,
            prompt: "Used for authenticating to your GitHub Gist.",
            ignoreFocusOut: true
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            if (value === undefined)
            {
                // reject if cancelled.
                p_reject(new Error("you abort the synchronization."));
            }
            else
            {
                const token = value.trim();
                if (p_forUpload && !token)
                {
                    // only reject when uploading.
                    p_reject(new Error("the GitHub Personal Access Token is not set."));
                }
                else
                {
                    p_resolve({ token });
                }
            }
        });
    });
}

/**
 * show Gist ID box.
 * @param {Boolean} [p_forUpload=true] default is true, show uploading message, else show downloading message.
 * @returns {Promise}
 */
function showGistInputBox(p_forUpload = true)
{
    return new Promise((p_resolve, p_reject) =>
    {
        const placeHolder = p_forUpload ?
            "Enter Gist ID (Leave it blank to create a new Gist automatically)." :
            "Enter Gist ID.";
        const options = {
            placeHolder: placeHolder,
            password: false,
            prompt: "Used for synchronizing your settings with Gist.",
            ignoreFocusOut: true
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            if (value === undefined)
            {
                // reject if cancelled.
                p_reject(new Error("you abort the synchronization."));
            }
            else
            {
                const id = value.trim();
                if (!p_forUpload && !id)
                {
                    // only reject when downloading.
                    p_reject(new Error("the Gist ID is not set."));
                }
                else
                {
                    p_resolve({ id });
                }
            }
        });
    });
}

/**
 * show remote Gist list box.
 * @param {Object} p_api
 * @param {Boolean} [p_forUpload=true] default is true, show uploading message, else show downloading message.
 * @returns {Promise}
 */
function showRemoteGistListBox(p_api, p_forUpload = true)
{
    return new Promise((p_resolve, p_reject) =>
    {
        this.status("Syncing: checking remote Gists...");
        return p_api.getAll()
            .then((gists) =>
            {
                const manualItem = {
                    label: `Enter Gist ID manually...`,
                    data: "@@manual"
                };

                // don't show quick pick dialog when gists is empty.
                if (gists && gists.length > 0)
                {
                    const items = gists.map((gist) => ({
                        label: `Gist ID: ${gist.id}`,
                        description: `Last uploaded ${moment.duration(new Date(gist.updated_at) - new Date()).humanize(true)}.`,
                        data: gist.id
                    }));
                    items.unshift(manualItem);
                    return vscode.window.showQuickPick(items, {
                        ignoreFocusOut: true,
                        matchOnDescription: true,
                        placeHolder: `Choose a Gist to ${p_forUpload ? "upload" : "download"} your settings.`
                    });
                }
                else
                {
                    return manualItem;
                }
            })
            .then((item) =>
            {
                // reject if cancelled.
                if (item)
                {
                    const id = item.data;
                    if (!p_forUpload && !id)
                    {
                        // only reject when downloading.
                        p_reject(new Error("the Gist ID is not set."));
                    }
                    else
                    {
                        if (id === "@@manual")
                        {
                            p_resolve({ id: "" });
                        }
                        else
                        {
                            p_resolve({ id });
                        }
                    }
                }
                else
                {
                    p_reject(new Error("you abort the synchronization."));
                }
            })
            .catch(p_reject);
    });
}

/**
 * show a "reload vscode" prompt dialog.
 */
function showReloadBox()
{
    const title = "Reload";
    const message = "Syncing: Extensions are successfully synced. Reload VSCode to take effect.";
    vscode.window.showInformationMessage(message, { title: title }).then((btn) =>
    {
        if (btn && btn.title === title)
        {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
    });
}

let spinnerTimer = null;
const spinner = {
    interval: 100,
    frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
};

/**
 * show a message with spinner and progress.
 * @param {String} p_message message to display after spinner.
 * @param {Number} p_progress current progress.
 * @param {Number} p_total total progress.
 */
function showSpinner(p_message, p_progress, p_total)
{
    clearSpinner();

    let text = "";
    if (p_progress !== undefined && p_progress !== null && p_total !== undefined && p_total !== null)
    {
        text = `[${p_progress}/${p_total}]`;
    }

    if (p_message !== undefined && p_message !== null && p_message !== "")
    {
        text = text ? `${text} ${p_message}` : `${p_message}`;
    }

    if (text)
    {
        text = ` ${text}`;
    }

    let step = 0;
    const frames = spinner.frames;
    const length = frames.length;
    spinnerTimer = setInterval(() =>
    {
        vscode.window.setStatusBarMessage(`${frames[step]}${text}`);
        step = (step + 1) % length;
    }, spinner.interval);
}

/**
 * clear spinner and show message, do nothing if currently no spinner is exist, .
 * @param {String} p_message message to show.
 */
function clearSpinner(p_message)
{
    if (spinnerTimer)
    {
        clearInterval(spinnerTimer);
        spinnerTimer = null;

        if (p_message !== undefined && p_message !== null)
        {
            vscode.window.setStatusBarMessage(p_message);
        }
    }
}

module.exports = {
    status,
    statusInfo,
    statusError,
    statusFatal,
    showGistInputBox,
    showRemoteGistListBox,
    showGitHubTokenInputBox,
    showReloadBox,
    showSpinner,
    clearSpinner
};
