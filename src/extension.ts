import * as vscode from "vscode";

import { Gist, Syncing, VSCodeSetting, AutoSyncService } from "./core";
import * as Toast from "./core/Toast";
import { localize, setup } from "./i18n";
import { ISyncedItem } from "./types/SyncingTypes";
import { registerCommand } from "./utils/vscodeAPI";

let _syncing: Syncing;
let _vscodeSetting: VSCodeSetting;
let _autoSyncService: AutoSyncService;
let _isReady: boolean;
let _isSynchronizing: boolean;

export function activate(context: vscode.ExtensionContext)
{
    _initCommands(context);
    _initSyncing(context);
    _initAutoSync();
}

export function deactivate()
{
    _stopAutoSyncService();
}

/**
 * Init the commands.
 */
function _initCommands(context: vscode.ExtensionContext)
{
    registerCommand(context, "syncing.uploadSettings", _uploadVSCodeSettings);
    registerCommand(context, "syncing.downloadSettings", _downloadVSCodeSettings);
    registerCommand(context, "syncing.openSettings", _openSyncingSettings);
}

/**
 * Init the extension.
 */
function _initSyncing(context: vscode.ExtensionContext)
{
    try
    {
        // 1. Setup i18n.
        setup(context.extensionPath);

        // 2. Init Syncing.
        _syncing = Syncing.create();
        _vscodeSetting = VSCodeSetting.create();

        _isReady = true;
    }
    catch (err)
    {
        _isReady = false;
        Toast.statusFatal(localize("error.initialization", err.message));
    }
}

/**
 * Init auto-sync.
 */
function _initAutoSync()
{
    if (_isReady)
    {
        setTimeout(async () =>
        {
            const syncingSettings = _syncing.loadSettings();
            if (syncingSettings.auto_sync && syncingSettings.token != null && syncingSettings.id != null)
            {
                _autoSyncService = AutoSyncService.create();
                // 1. Synchronization on activation.
                _autoSyncService.synchronize(syncingSettings);

                // 2. Start watching.
                _autoSyncService.start();
            }
        }, 3000);
    }
}

/**
 * Uploads your settings.
 */
async function _uploadVSCodeSettings()
{
    if (_isReady && !_isSynchronizing)
    {
        _isSynchronizing = true;
        try
        {
            const syncingSettings = await _syncing.prepareUploadSettings(true);
            const api = Gist.create(syncingSettings.token, _syncing.proxy);
            const settings = await _vscodeSetting.getSettings(true, true);
            const gist = await api.findAndUpdate(syncingSettings.id, settings, true, true);
            if (gist.id !== syncingSettings.id)
            {
                await _syncing.saveSettings({ ...syncingSettings, id: gist.id });
            }

            // Synchronizes the last modified time.
            for (const setting of settings)
            {
                await _vscodeSetting.saveLastModifiedTime(setting, gist.updated_at);
            }

            Toast.statusInfo(localize("toast.settings.uploaded"));
        }
        catch { }
        finally
        {
            _isSynchronizing = false;
        }
    }
}

/**
 * Downloads your settings.
 */
async function _downloadVSCodeSettings()
{
    if (_isReady && !_isSynchronizing)
    {
        _isSynchronizing = true;
        _pauseAutoSyncService();
        try
        {
            const syncingSettings = await _syncing.prepareDownloadSettings(true);
            const api = Gist.create(syncingSettings.token, _syncing.proxy);
            try
            {
                const gist = await api.get(syncingSettings.id, true);
                const syncedItems = await _vscodeSetting.saveSettings(gist, true);
                Toast.statusInfo(localize("toast.settings.downloaded"));
                if (_isExtensionsSynced(syncedItems))
                {
                    Toast.showReloadBox();
                }
            }
            catch (err)
            {
                if (err.code === 401)
                {
                    _syncing.clearGitHubToken();
                }
                else if (err.code === 404)
                {
                    _syncing.clearGistID();
                }
            }
        }
        catch { }
        finally
        {
            _isSynchronizing = false;
            _resumeAutoSyncService();
        }
    }
}

/**
 * Opens the Syncing's settings file in a VSCode editor.
 */
function _openSyncingSettings()
{
    if (_isReady)
    {
        _syncing.openSettings();
    }
}

/**
 * Determines whether the extensions are actually synchronized.
 */
function _isExtensionsSynced(syncedItems: { updated: ISyncedItem[]; removed: ISyncedItem[] }): boolean
{
    for (const item of syncedItems.updated)
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

function _pauseAutoSyncService()
{
    if (_autoSyncService)
    {
        _autoSyncService.pause();
    }
}

function _resumeAutoSyncService()
{
    if (_autoSyncService)
    {
        _autoSyncService.resume();
    }
}

function _stopAutoSyncService()
{
    if (_autoSyncService)
    {
        _autoSyncService.stop();
    }
}
