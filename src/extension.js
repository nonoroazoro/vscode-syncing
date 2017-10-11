const fs = require("fs");
const vscode = require("vscode");

const moment = require("moment");
const Gist = require("./utils/Gist");
const Toast = require("./utils/Toast");
const Config = require("./utils/Config");

import Environment from "./utils/Environment";

let _env;
let _config;
let _isSyncing;

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
    _isSyncing = false;

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
    if (!_isSyncing)
    {
        _isSyncing = true;
        _config.prepareUploadSettings(true).then((settings) =>
        {
            const api = Gist.create(settings.token, _env.getSyncingProxy());
            return _config.getConfigs({ load: true, showIndicator: true }).then((configs) =>
            {
                return api.findAndUpdate({ id: settings.id, uploads: configs, showIndicator: true }).then((gist) =>
                {
                    if (gist.id === settings.id)
                    {
                        Toast.statusInfo("Syncing: Settings uploaded.");
                    }
                    else
                    {
                        _config.saveSyncingSettings(Object.assign({}, settings, { id: gist.id })).then(() =>
                        {
                            Toast.statusInfo("Syncing: Settings uploaded.");
                        });
                    }

                    _isSyncing = false;
                });
            });
        }).catch(() =>
        {
            _isSyncing = false;
        });
    }
}

/**
 * download settings.
 */
function _downloadSettings()
{
    if (!_isSyncing)
    {
        _isSyncing = true;
        _config.prepareDownloadSettings(true).then((settings) =>
        {
            const api = Gist.create(settings.token, _env.getSyncingProxy());
            return api.get(settings.id, true).then((gist) =>
            {
                return _config.saveConfigs(gist.files, true).then((synced) =>
                {
                    // TODO: log synced files.
                    Toast.statusInfo("Syncing: Settings downloaded.");
                    if (_isExtensionsSynced(synced))
                    {
                        Toast.showReloadBox();
                    }

                    _isSyncing = false;
                });
            }).catch((err) =>
            {
                if (err.code === 401)
                {
                    _config.clearSyncingToken();
                }
                else if (err.code === 404)
                {
                    _config.clearSyncingID();
                }

                _isSyncing = false;
            });
        }).catch(() =>
        {
            _isSyncing = false;
        });
    }
}

/**
 * open Syncing's settings.
 */
function _openSettings()
{
    if (fs.existsSync(_env.syncingSettingsPath))
    {
        _openFile(_env.syncingSettingsPath);
    }
    else
    {
        _config.initSyncingSettings().then(() =>
        {
            _openFile(_env.syncingSettingsPath);
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
