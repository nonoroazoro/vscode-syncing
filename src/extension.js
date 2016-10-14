const vscode = require("vscode");
const Config = require("./Config");

function activate(p_context)
{
    const config = _initConfig(p_context);
    _initCommands(p_context);
}

function _initConfig(p_context)
{
    return new Config(p_context);
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
 * wrap registerCommand.
 */
function _registerCommand(p_context, p_command, p_callback)
{
    p_context.subscriptions.push(vscode.commands.registerCommand(p_command, p_callback));
}

module.exports.activate = activate;
