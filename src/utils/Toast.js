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

module.exports = {
    status,
    statusInfo,
    statusError
};
