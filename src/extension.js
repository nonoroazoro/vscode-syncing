const async = require("async");
const vscode = require("vscode");

const Gist = require("./utils/Gist");
const Config = require("./utils/Config");
const Toast = require("./utils/Toast");

let _api;
let _config;
let _token;
let _gistID;
let _settings;

function activate(p_context)
{
    _initGlobals(p_context);
    _initCommands(p_context);
}

function _initGlobals(p_context)
{
    // TODO:
    _config = new Config(p_context);
    _prepareSyncingSettings(_config).then(() =>
    {
        console.log("");
    }).catch(() =>
    {
        Toast.statusInfo("Syncing: canceled as Github Access Token or Gist ID isn't set.");
    });

    // Syncing's config.
    _gistID = "";
    _token = "";
    _api = new Gist(_token, { proxy: "http://127.0.0.1:1080" });
}

function _prepareSyncingSettings(p_config)
{
    return new Promise((p_resolve, p_reject) =>
    {
        _settings = p_config.loadSyncingSettings();

        const tasks = [];
        if (!_settings.token)
        {
            tasks.push(Toast.showGitHubTokenInputBox);
        }
        if (!_settings.id)
        {
            tasks.push(Toast.showGistInputBox);
        }
        async.eachSeries(
            tasks,
            (task, done) =>
            {
                task().then((value) =>
                {
                    Object.assign(_settings, value);
                    done();
                }).catch((err) =>
                {
                    done(err);
                });
            },
            (err) =>
            {
                if (err || !_settings.token || !_settings.id)
                {
                    p_reject();
                }
                else
                {
                    p_resolve();
                }
            }
        );
    });
}

function _initCommands(p_context)
{
    _registerCommand(p_context, "syncing.uploadSettings", _uploadSettings);
    _registerCommand(p_context, "syncing.downloadSettings", _downloadSettings);
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
