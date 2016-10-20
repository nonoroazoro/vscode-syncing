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
    // console.log(vscode.commands.getCommands().then((commands) =>
    // {
    //     console.log(commands.join("\n"));
    // }));

    _initGlobals(p_context);
    _initCommands(p_context);
}

function _initGlobals(p_context)
{
    // Syncing's config.
    _gistID = "";
    _token = "";
    _config = new Config(p_context);
    _api = new Gist(_token, { proxy: "http://127.0.0.1:1080" });
}

function _initCommands(p_context)
{
    _registerCommand(p_context, "syncing.uploadSettings", _uploadSettings);
    _registerCommand(p_context, "syncing.downloadSettings", _downloadSettings);

    // DEBUG
    // vscode.commands.executeCommand("syncing.downloadSettings");
}

/**
 * registerCommand wrapper.
 */
function _registerCommand(p_context, p_command, p_callback)
{
    p_context.subscriptions.push(vscode.commands.registerCommand(p_command, p_callback));
}

/**
 * upload settings.
 */
function _uploadSettings()
{
    Toast.status("Syncing: gathering local settings...");
    _config.getConfigs({ load: true }).then((uploads) =>
    {
        Toast.status("Syncing: uploading settings...");
        _api.findAndUpdate(_gistID, uploads).then((gist) =>
        {
            // TODO: check if auto created a new gist id, save it!
            Toast.statusInfo("Syncing: settings uploaded.");
        }).catch(() =>
        {
            Toast.statusError("Syncing: upload failed, please check your Internet connection.");
        });
    }).catch((err) =>
    {
        Toast.statusError(`Syncing: upload failed: ${err.message}`);
    });
}

/**
 * download settings.
 */
function _downloadSettings()
{
    Toast.status("syncing: checking remote settings...");
    _api.get(_gistID).then((gist) =>
    {
        Toast.status("syncing: downloading settings...");
        _config.saveConfigs(gist.files).then((saved) =>
        {
            Toast.statusInfo("Syncing: settings downloaded.");
        }).catch((err) =>
        {
            Toast.statusError(`Syncing: download failed: ${err.message}`);
        });
    }).catch(() =>
    {
        Toast.statusError("Syncing: download failed, please check your Internet connection.");
    });
}

module.exports.activate = activate;
