import { basename } from "node:path";
import * as junk from "junk";

import { AbstractWatcher, WatcherEvent } from "./AbstractWatcher";
import { ChokidarFileWatcher } from "./ChokidarFileWatcher";
import { debounce } from "../utils/timer";
import { Environment, Syncing } from "../core";
import { VSCodeExtensionWatcher } from "./VSCodeExtensionWatcher";

export interface SettingsWatcherServiceOptions
{
    /**
     * Sets a value indicating whether to enable event debounce.
     *
     * Defaults to `true`.
     *
     * @default true
     */
    debounce: boolean;

    /**
     * Sets the debounce delay `in milliseconds`.
     *
     * Defaults to `10 seconds`.
     *
     * @default 10000
     */
    debounceDelay: number;
}

export class SettingsWatcherService extends AbstractWatcher<WatcherEvent.ALL>
{
    private static readonly _DEFAULT_OPTIONS: SettingsWatcherServiceOptions = {
        debounce: true,
        debounceDelay: 10000
    };

    private _options: SettingsWatcherServiceOptions;
    private _fileWatcher: ChokidarFileWatcher | undefined;
    private _extensionWatcher: VSCodeExtensionWatcher | undefined;

    constructor(options?: SettingsWatcherServiceOptions)
    {
        super();
        this._options = { ...SettingsWatcherService._DEFAULT_OPTIONS, ...options };
        if (this._options.debounce)
        {
            this._handleWatcherEvent = debounce(
                this._handleWatcherEvent,
                this._options.debounceDelay
            );
        }
    }

    public start()
    {
        if (!this._fileWatcher)
        {
            const env = Environment.create();
            const syncing = Syncing.create();
            this._fileWatcher = new ChokidarFileWatcher(
                env.userDirectory,
                {
                    ignored: [
                        // Ignore Syncing's settings file.
                        syncing.settingsPath,

                        // Ignore VSCode's directories.
                        "./globalStorage/",
                        "./History/",
                        "./workspaceStorage/",

                        // Ignore non-json files and junk files but keep directories.
                        (path, stats) =>
                        {
                            if (stats?.isFile())
                            {
                                return !path.endsWith(".json") || junk.is(basename(path));
                            }
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

    public resume()
    {
        super.resume();

        // Clear the debounce queue to prevent firing the events collected
        // during the suspension.
        // Note: The debounce queue must be cleared here instead of in `pause`.
        if (this._options.debounce)
        {
            (this._handleWatcherEvent as any).cancel();
        }
    }

    public stop()
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
