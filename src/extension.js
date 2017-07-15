const fs = require("fs");
const vscode = require("vscode");

const moment = require("moment");
const Gist = require("./utils/Gist");
const Toast = require("./utils/Toast");
const Config = require("./utils/Config");
const Environment = require("./utils/Environment");

let _env;
let _config;

function activate(p_context)
{
    _initGlobals(p_context);
    _initCommands(p_context);
}

/**
 * init global variables.
 * @param {Object} p_context
 */
function _initGlobals(p_context)
{
    _env = Environment.create(p_context);
    _config = Config.create(p_context);

    // TODO: i18n, using vscode.env.language
    moment.locale("en");
}

/**
 * init Syncing's commands.
 * @param {Object} p_context
 */
function _initCommands(p_context)
{
    _registerCommand(p_context, "syncing.uploadSettings", _uploadSettings);
    _registerCommand(p_context, "syncing.downloadSettings", _downloadSettings);
    _registerCommand(p_context, "syncing.openSettings", _openSettings);
}

/**
 * vscode's registerCommand wrapper.
 */
function _registerCommand(p_context, p_command, p_callback)
{
    // add to a list of disposables which are disposed when this extension is deactivated.
    p_context.subscriptions.push(vscode.commands.registerCommand(p_command, p_callback));
}

/**
 * upload settings.
 */
function _uploadSettings()
{
    Toast.status("Syncing: gathering local settings...");
    _config.prepareUploadSettings().then((settings) =>
    {
        const api = Gist.create(settings.token, _env.getSyncingProxy());
        _config.getConfigs({ load: true }).then((configs) =>
        {
            Toast.status("Syncing: uploading settings...");
            return api.findAndUpdate(settings.id, configs).then((gist) =>
            {
                if (gist.id === settings.id)
                {
                    Toast.statusInfo("Syncing: settings uploaded.");
                }
                else
                {
                    _config.saveSyncingSettings(Object.assign({}, settings, { id: gist.id })).then(() =>
                    {
                        Toast.statusInfo("Syncing: settings uploaded.");
                    });
                }
            });
        }).catch((err) =>
        {
            Toast.statusError(`Syncing: upload failed. ${err.message}`);
        });
    }).catch((err) =>
    {
        Toast.statusError(`Syncing: canceled. ${err.message}`);
    });
}

/**
 * download settings.
 */
function _downloadSettings()
{
    Toast.status("Syncing: checking remote settings...");
    _config.prepareDownloadSettings().then((settings) =>
    {
        const api = Gist.create(settings.token, _env.getSyncingProxy());
        api.get(settings.id).then((gist) =>
        {
            Toast.status("Syncing: downloading settings...");
            return _config.saveConfigs(gist.files).then((synced) =>
            {
                // TODO: log synced files.
                Toast.statusInfo("Syncing: settings downloaded.");
                if (_isExtensionsSynced(synced))
                {
                    Toast.showReloadBox();
                }
            });
        }).catch((err) =>
        {
            if (err.code === 401)
            {
                _config.clearSyncingToken().then(() =>
                {
                    Toast.statusError(`Syncing: download failed. ${err.message}`);
                });
            }
            else if (err.code === 404)
            {
                _config.clearSyncingID().then(() =>
                {
                    Toast.statusError(`Syncing: download failed. ${err.message}`);
                });
            }
            else
            {
                Toast.statusError(`Syncing: download failed. ${err.message}`);
            }
        });
    }).catch((err) =>
    {
        Toast.statusError(`Syncing: canceled. ${err.message}`);
    });
}

/**
 * open Syncing's settings.
 */
function _openSettings()
{
    if (fs.existsSync(_env.syncingSettingPath))
    {
        _openFile(_env.syncingSettingPath);
    }
    else
    {
        _config.initSyncingSettings().then(() =>
        {
            _openFile(_env.syncingSettingPath);
        });
    }
}

/**
 * check if extensions are actually synced.
 * @returns {Boolean}
 */
function _isExtensionsSynced(p_synced)
{
    for (const item of p_synced.updated)
    {
        if (item.extension && (
            item.extension.added.length > 0
            || item.extension.removed.length > 0
            || item.extension.updated.length > 0)
        )
        {
            return true;
        }
    }
    return false;
}

/**
 * open file in vscode.
 * @param {String} p_filepath
 */
function _openFile(p_filepath)
{
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(p_filepath));
}

module.exports.activate = activate;
