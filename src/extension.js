const vscode = require("vscode");

const Gist = require("./utils/Gist");
const Config = require("./utils/Config");
const Toast = require("./utils/Toast");

let _api;
let _config;
let _gistID;
let _token;

function activate(p_context)
{
    _initGlobals(p_context);
    _initCommands(p_context);
}

function _initGlobals(p_context)
{
    // Syncing's config.
    _gistID = "";
    _token = "";
    _config = new Config(p_context);
    _api = new Gist(_token);
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
    Toast.status("syncing: download settings...");

    Toast.statusInfo("syncing: download finished.");
}

/**
 * upload settings.
 */
function _uploadSettings()
{
    Toast.status("Syncing: upload settings...");

    _config.getUploads({ load: true }).then((uploads) =>
    {
        _api.findAndUpdate(_gistID, uploads).then((gist) =>
        {
            Toast.statusInfo("Syncing: upload finished.");
        }).catch((err) =>
        {
            Toast.statusError("Syncing: upload failed, please check your Internet connection.");
        });
    }).catch((err) =>
    {
        Toast.statusError(`Syncing: upload failed: ${err.message}`);
    });
}

module.exports.activate = activate;
