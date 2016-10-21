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
 * @returns {Promise}
 */
function showGitHubTokenInputBox()
{
    return new Promise((p_resolve, p_reject) =>
    {
        const options = {
            placeHolder: "Enter Your Github Personal Access Token.",
            password: false,
            prompt: "Used to access your GitHub account.",
            ignoreFocusOut: true
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            if (value)
            {
                p_resolve({ token: value.trim() });
            }
            else
            {
                p_reject(new Error("Canceled."));
            }
        });
    });
}

/**
 * show Gist id box.
 * @returns {Promise}
 */
function showGistInputBox()
{
    return new Promise((p_resolve, p_reject) =>
    {
        const options = {
            placeHolder: "Enter Your Gist ID.",
            password: false,
            prompt: "Used to sync vscode settings to Gist.",
            ignoreFocusOut: true
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            if (value)
            {
                p_resolve({ id: value.trim() });
            }
            else
            {
                p_reject(new Error("Canceled."));
            }
        });
    });
}

module.exports = {
    status,
    statusInfo,
    statusError,
    showGistInputBox,
    showGitHubTokenInputBox
};
