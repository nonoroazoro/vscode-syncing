import * as vscode from "vscode";

import * as Toast from "./Toast";
import { VSCodeSetting } from "./VSCodeSetting";
import { Gist } from "./Gist";
import { ISyncingSettings, ISetting } from "../types/SyncingTypes";
import { isAfter } from "../utils/date";
import { SettingsWatcherService, WatcherEvent } from "../watcher";
import { IGist } from "../types/GitHubTypes";
import { localize } from "../i18n";

export class AutoSyncService
{
    private static _instance: AutoSyncService;

    private _vscodeSetting: VSCodeSetting;
    private _watcher: SettingsWatcherService;

    private constructor()
    {
        this._vscodeSetting = VSCodeSetting.create();
        this._watcher = new SettingsWatcherService();
        this._watcher.on(WatcherEvent.ALL, this._handleWatcherEvent);
    }

    /**
     * Creates an instance of singleton class `AutoSyncService`.
     */
    public static create(): AutoSyncService
    {
        if (!AutoSyncService._instance)
        {
            AutoSyncService._instance = new AutoSyncService();
        }
        return AutoSyncService._instance;
    }

    /**
     * Start auto-sync service.
     */
    public start()
    {
        this._watcher.start();
    }

    /**
     * Pause auto-sync service.
     */
    public pause()
    {
        this._watcher.pause();
    }

    /**
     * Resume auto-sync service.
     */
    public resume()
    {
        this._watcher.resume();
    }

    /**
     * Stop auto-sync service.
     */
    public stop()
    {
        this._watcher.stop();
    }

    /**
     * Check the last modified time of remote and local settings, and make a synchronization if necessary.
     */
    public async synchronize(syncingSettings: ISyncingSettings)
    {
        Toast.showSpinner(localize("toast.settings.autoSync.checkingSettings"));
        try
        {
            const { token, id, http_proxy } = syncingSettings;
            const localSettings = await this._vscodeSetting.getSettings(true);
            const localLastModified = await this._vscodeSetting.getLastModified(localSettings);

            const api = Gist.create(token, http_proxy);
            const remoteSettings = await api.get(id);
            const remoteLastModified = api.getLastModified(remoteSettings);
            if (this._isModified(localSettings, remoteSettings, api))
            {
                if (isAfter(localLastModified, remoteLastModified))
                {
                    // Upload settings.
                    console.info("first uploading");
                    await vscode.commands.executeCommand("syncing.uploadSettings");
                }
                else
                {
                    // Download settings.
                    console.info("first downloading");
                    await vscode.commands.executeCommand("syncing.downloadSettings");
                }
            }
            else
            {
                // Do nothing if not modified.
                Toast.clearSpinner("");
                Toast.statusInfo(localize("toast.settings.autoSync.nothingChanged"));
            }
        }
        catch (err)
        {
            Toast.statusError(localize("toast.settings.autoSync.failed", err.message));
        }
    }

    private _handleWatcherEvent()
    {
        // Upload settings whenever the user changed the local settings.
        console.info("auto uploading");
        vscode.commands.executeCommand("syncing.uploadSettings");
    }

    private _isModified(localSettings: ISetting[], remoteSettings: IGist, api: Gist): boolean
    {
        const localFiles = {} as any;
        for (const item of localSettings)
        {
            // Filter out `null` content.
            if (item.content)
            {
                localFiles[item.remoteFilename] = { content: item.content };
            }
        }
        return api.getModifiedFiles(localFiles, remoteSettings.files) != null;
    }
}
