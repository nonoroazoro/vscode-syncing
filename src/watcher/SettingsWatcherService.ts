import { Stats } from "fs-extra";
import { basename } from "path";
import * as junk from "junk";

import { AbstractWatcher, WatcherEvent } from "./AbstractWatcher";
import { ChokidarFileWatcher } from "./ChokidarFileWatcher";
import { VSCodeExtensionWatcher } from "./VSCodeExtensionWatcher";
import { Environment, Syncing } from "../core";

export class SettingsWatcherService extends AbstractWatcher<WatcherEvent.ALL>
{
    private _fileWatcher: ChokidarFileWatcher | undefined;
    private _extensionWatcher: VSCodeExtensionWatcher | undefined;

    public async start()
    {
        if (!this._fileWatcher)
        {
            const env = Environment.create();
            const syncing = Syncing.create();
            this._fileWatcher = new ChokidarFileWatcher(
                env.userDirectory,
                {
                    ignored: [
                        syncing.settingsPath, // Ignore Syncing's settings file.
                        "**/globalStorage/**",
                        "**/workspaceStorage/**",
                        (path: string, stats: Stats) =>
                        {
                            if (stats && stats.isFile())
                            {
                                // Ignore junk files and non-json files.
                                return junk.is(basename(path)) || !path.endsWith(".json");
                            }
                            // Do not ignore directories.
                            return false;
                        }
                    ]
                }
            );
            this._fileWatcher.on(WatcherEvent.ALL, this._handleWatcherEvent);
            this._fileWatcher.start();
        }

        if (!this._extensionWatcher)
        {
            this._extensionWatcher = new VSCodeExtensionWatcher();
            this._extensionWatcher.on(WatcherEvent.ALL, this._handleWatcherEvent);
            this._extensionWatcher.start();
        }
    }

    public async stop()
    {
        super.stop();
        if (this._fileWatcher)
        {
            this._fileWatcher.stop();
            this._fileWatcher = undefined;
        }
        if (this._extensionWatcher)
        {
            this._extensionWatcher.stop();
            this._extensionWatcher = undefined;
        }
    }

    private _handleWatcherEvent = () =>
    {
        this.emit(WatcherEvent.ALL);
    };
}
