import * as fs from "fs";
import * as moment from "moment";
import * as vscode from "vscode";

import Config from "./utils/Config";
import Environment from "./utils/Environment";
import { ISyncStatus } from "./utils/Extension";
import Gist from "./utils/Gist";
import Toast from "./utils/Toast";

let _config: Config;
let _env: Environment;
let _isSyncing: boolean;

export function activate(context: vscode.ExtensionContext): void
{
    _initGlobals(context);
    _initCommands(context);
}

/**
 * Init global variables.
 */
function _initGlobals(context: vscode.ExtensionContext): void
{
    _config = Config.create(context);
    _env = Environment.create(context);
    _isSyncing = false;

    // TODO: i18n, using vscode.env.language
    moment.locale("en");
}

/**
 * Init Syncing's commands.
 */
function _initCommands(context: vscode.ExtensionContext): void
{
    _registerCommand(context, "syncing.uploadSettings", _uploadSettings);
    _registerCommand(context, "syncing.downloadSettings", _downloadSettings);
    _registerCommand(context, "syncing.openSettings", _openSettings);
}

/**
 * VSCode's registerCommand wrapper.
 */
function _registerCommand(context: vscode.ExtensionContext, command: string, callback: (...args: any[]) => any): void
{
    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(vscode.commands.registerCommand(command, callback));
}

/**
 * Upload settings.
 */
function _uploadSettings(): void
{
    if (!_isSyncing)
    {
        _isSyncing = true;
        _env.reloadSyncingProxy();
        _config.prepareUploadSettings(true).then((settings) =>
        {
            const api = Gist.create(settings.token, _env.syncingProxy);
            return _config.getConfigs({ load: true, showIndicator: true }).then((configs) =>
            {
                return api.findAndUpdate(settings.id, configs, true, true).then((gist: any) =>
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
function _downloadSettings(): void
{
    if (!_isSyncing)
    {
        _isSyncing = true;
        _env.reloadSyncingProxy();
        _config.prepareDownloadSettings(true).then((settings) =>
        {
            const api = Gist.create(settings.token, _env.syncingProxy);
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
 * Open Syncing's settings.
 */
function _openSettings(): void
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
 * Check if extensions are actually synced.
 */
function _isExtensionsSynced(items: { updated: ISyncStatus[], removed: ISyncStatus[] }): boolean
{
    for (const item of items.updated)
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
 * Open file with VSCode.
 * @param filepath Full path of file.
 */
function _openFile(filepath: string)
{
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(filepath));
}
