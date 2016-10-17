const vscode = require("vscode");
const Config = require("./utils/Config");
const Gist = require("./utils/Gist");

function activate(p_context)
{
    const config = new Config(p_context);
    _initCommands(p_context);

    const api = new Gist("", config);
    api.prepare("").then((value) =>
    {
        console.log(value);
    }).catch((err) =>
    {
        console.log(err);
    });
}

function _initCommands(p_context)
{
    // 1. downloadSettings
    _registerCommand(p_context, "syncing.downloadSettings", () =>
    {
        vscode.window.showInformationMessage("Download Settings!");
    });

    // 2. uploadSettings
    _registerCommand(p_context, "syncing.uploadSettings", () =>
    {
        vscode.window.showInformationMessage("Upload Settings!");
    });

    vscode.commands.executeCommand("syncing.downloadSettings");
}

/**
 * registerCommand wrapper.
 */
function _registerCommand(p_context, p_command, p_callback)
{
    p_context.subscriptions.push(vscode.commands.registerCommand(p_command, p_callback));
}

module.exports.activate = activate;
