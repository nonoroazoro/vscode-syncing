import * as vscode from "vscode";

import * as Toast from "./Toast";
import { VSCodeSetting } from "./VSCodeSetting";
import { Gist } from "./Gist";
import { ISyncingSettings } from "../types/SyncingTypes";
import { isAfter } from "../utils/date";
import { SettingsWatcherService, WatcherEvent } from "../watcher";

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
        Toast.showSpinner("Syncing: auto-sync service is checking your settings...");
        try
        {
            const { token, id, http_proxy } = syncingSettings;
            const lastModifiedLocal = await this._vscodeSetting.getSettingsLastModified();
            const lastModifiedRemote = await Gist.create(token, http_proxy).getLastModified(id);
            if (isAfter(lastModifiedLocal, lastModifiedRemote))
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
        catch (err)
        {
            // Toast.statusError(`toast.settings.autoSync.failed ${err.message}`);
        }
    }

    private _handleWatcherEvent()
    {
        // Upload settings whenever the user changed the local settings.
        console.info("auto uploading");
        vscode.commands.executeCommand("syncing.uploadSettings");
    }
}
