/**
 * vscode message utils.
 */

const vscode = require("vscode");

/**
 * toast message in vscode status bar. auto-hide the message when `p_time` is set.
 * @param {string} p_message message to show.
 * @param {number} [p_time=2000] hide after time.
 */
function status(p_message, p_time)
{
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
 * @param {any} p_message
 */
function statusInfo(p_message)
{
    status(p_message, 4000);
}

/**
 * toast `error` message in vscode status bar (auto-hide).
 * @param {any} p_message
 */
function statusError(p_message)
{
    status(p_message, 8000);
}

/**
 * show GitHub access token box.
 * @param {boolean} [p_forUpload=true] default is true, show uploading message, else show downloading message.
 * @returns {Promise}
 */
function showGitHubTokenInputBox(p_forUpload = true)
{
    return new Promise((p_resolve, p_reject) =>
    {
        const placeHolder = p_forUpload ?
            "Enter GitHub Personal Access Token." :
            "Enter GitHub Personal Access Token (Leave blank to download from a public Gist).";
        const options = {
            placeHolder: placeHolder,
            password: false,
            prompt: "Used for authenticating to your GitHub Gist.",
            ignoreFocusOut: true
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            p_resolve({ token: value ? value.trim() : "" });
        });
    });
}

/**
 * show Gist id box.
 * @param {boolean} [p_forUpload=true] default is true, show uploading message, else show downloading message.
 * @returns {Promise}
 */
function showGistInputBox(p_forUpload = true)
{
    return new Promise((p_resolve, p_reject) =>
    {
        const placeHolder = p_forUpload ?
            "Enter Your Gist ID (Leave it blank to create a new Gist automatically)." :
            "Enter GitHub Personal Access Token.";
        const options = {
            placeHolder: placeHolder,
            password: false,
            prompt: "Used for synchronizing your settings to Gist.",
            ignoreFocusOut: true
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            p_resolve({ id: value ? value.trim() : "" });
        });
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

module.exports = {
    status,
    statusInfo,
    statusError,
    showGistInputBox,
    showGitHubTokenInputBox,
    showReloadBox
};
