/**
 * vscode message utils.
 */

const moment = require("moment");
const vscode = require("vscode");

/**
 * toast message in vscode status bar. auto-hide the message when `p_time` is set.
 * @param {String} p_message message to show.
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
 * show Gist ID box.
 * @param {Boolean} [p_forUpload=true] default is true, show uploading message, else show downloading message.
 * @returns {Promise}
 */
function showGistInputBox(p_forUpload = true)
{
    return new Promise((p_resolve, p_reject) =>
    {
        const placeHolder = p_forUpload ?
            "Enter Gist ID (Leave blank to create a new Gist automatically)." :
            "Enter Gist ID.";
        const options = {
            placeHolder: placeHolder,
            password: false,
            prompt: "Used for synchronizing your settings with Gist.",
            ignoreFocusOut: true
        };
        vscode.window.showInputBox(options).then((value) =>
        {
            p_resolve({ id: value ? value.trim() : "" });
        });
    });
}

/**
 * show remote Gist list box.
 * @param {Boolean} [p_forUpload=true] default is true, show uploading message, else show downloading message.
 * @returns {Promise}
 */
function showRemoteGistListBox(p_api, p_forUpload = true)
{
    return new Promise((p_resolve, p_reject) =>
    {
        p_api.getAll()
            .then((gists) =>
            {
                const items = gists.map((gist) => ({
                    label: `${gist.id}`,
                    description: `Last uploaded ${moment.duration(new Date(gist.updated_at) - new Date()).humanize(true)}.`,
                    data: gist.id
                }));
                items.unshift({
                    label: `Enter Gist ID manually...`,
                    description: "Choose this if you wanna enter manually."
                });
                return items;
            })
            .then((items) =>
                vscode.window.showQuickPick(items, {
                    matchOnDetail: true,
                    placeHolder: `Choose a Gist to ${p_forUpload ? "upload" : "download"} your settings.`
                })
            )
            .then((item) =>
            {
                let data;
                let cancelled = true;
                if (item)
                {
                    cancelled = false;
                    if (item.data)
                    {
                        data = item.data;
                    }
                }
                p_resolve({ cancelled, data });
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
    statusFatal,
    showGistInputBox,
    showRemoteGistListBox,
    showGitHubTokenInputBox,
    showReloadBox
};
