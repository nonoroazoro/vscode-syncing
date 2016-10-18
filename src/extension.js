const vscode = require("vscode");
const Config = require("./utils/Config");
const Gist = require("./utils/Gist");

let _api;
let _configs;
let _gistID;
let _token;

function activate(p_context)
{
    _initGlobals(p_context);
    _initCommands(p_context);
}

function _initGlobals(p_context)
{
    // extension configs.
    _configs = new Config(p_context);
    _token = "";
    _gistID = "";

    // gist api.
    _api = new Gist(_token);
    // _api.prepare(_gistID).then((value) =>
    // {
    //     console.log(value);
    // }).catch((err) =>
    // {
    //     console.log(err);
    // });
}

function _initCommands(p_context)
{
    _registerCommand(p_context, "syncing.downloadSettings", _downloadSettings);
    _registerCommand(p_context, "syncing.uploadSettings", _uploadSettings);

    // DEBUG
    vscode.commands.executeCommand("syncing.uploadSettings");
}

/**
 * registerCommand wrapper.
 */
function _registerCommand(p_context, p_command, p_callback)
{
    p_context.subscriptions.push(vscode.commands.registerCommand(p_command, p_callback));
}

/**
 * download settings.
 */
function _downloadSettings()
{
    vscode.window.showInformationMessage("syncing: download settings...");
}

/**
 * download settings.
 */
function _uploadSettings()
{
    vscode.window.showInformationMessage("syncing: upload settings...");

    _configs.getUploads({ load: true }).then((p_uploads) =>
    {
        _api.findAndUpdate(_gistID, p_uploads).then((gist) =>
        {
            vscode.window.showInformationMessage("syncing: upload finished.");
        }).catch((err) =>
        {
            vscode.window.showInformationMessage("syncing: upload failed.");
        });
    });
}

module.exports.activate = activate;
