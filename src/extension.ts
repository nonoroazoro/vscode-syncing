import * as moment from "moment";
import * as vscode from "vscode";

import * as GitHubTypes from "./common/GitHubTypes";
import { ISyncedItem } from "./common/types";
import Config from "./core/Config";
import Gist from "./core/Gist";
import Syncing from "./core/Syncing";
import * as Toast from "./core/Toast";

let _config: Config;
let _syncing: Syncing;
let _isSyncing: boolean;

export function activate(context: vscode.ExtensionContext)
{
    _init(context);
}

/**
 * Init.
 */
function _init(context: vscode.ExtensionContext)
{
    _isSyncing = false;
    _config = Config.create(context);
    _syncing = Syncing.create(context);

    // TODO: i18n, using vscode.env.language
    moment.locale("en");

    _initCommands(context);
}

/**
 * Init extension commands.
 */
function _initCommands(context: vscode.ExtensionContext)
{
    _registerCommand(context, "syncing.uploadSettings", _uploadSettings);
    _registerCommand(context, "syncing.downloadSettings", _downloadSettings);
    _registerCommand(context, "syncing.openSettings", _openSettings);
}

/**
 * VSCode's registerCommand wrapper.
 */
function _registerCommand(context: vscode.ExtensionContext, command: string, callback: () => void)
{
    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(vscode.commands.registerCommand(command, callback));
}

/**
 * Upload settings.
 */
function _uploadSettings()
{
    if (!_isSyncing)
    {
        _isSyncing = true;
        _syncing.prepareUploadSettings(true).then((settings) =>
        {
            const api = Gist.create(settings.token, _syncing.proxy);
            return _config.getConfigs(true, true).then((configs) =>
            {
                return api.findAndUpdate(settings.id, configs, true, true).then((gist: GitHubTypes.IGist) =>
                {
                    if (gist.id === settings.id)
                    {
                        Toast.statusInfo("Syncing: Settings uploaded.");
                    }
                    else
                    {
                        _syncing.saveSettings({ ...settings, id: gist.id }).then(() =>
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
        _syncing.prepareDownloadSettings(true).then((settings) =>
        {
            const api = Gist.create(settings.token, _syncing.proxy);
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
                    _syncing.clearGitHubToken();
                }
                else if (err.code === 404)
                {
                    _syncing.clearGistID();
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
 * Open Syncing's settings file in the VSCode editor.
 */
function _openSettings()
{
    _syncing.openSettings();
}

/**
 * Check if extensions are actually synced.
 */
function _isExtensionsSynced(syncLog: { updated: ISyncedItem[], removed: ISyncedItem[] }): boolean
{
    for (const item of syncLog.updated)
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
