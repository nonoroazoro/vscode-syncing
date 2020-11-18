import { Stats } from "fs-extra";
import * as chokidar from "chokidar";

import { WatcherEvent, AbstractWatcher } from "./AbstractWatcher";

export type ChokidarPaths = string | string[];

export type ChokidarOptions = chokidar.WatchOptions | { ignored?: ChokidarIgnored };

export type ChokidarIgnored = string | ChokidarIgnoredFunction | Array<string | ChokidarIgnoredFunction>;

/**
 * Returns `true` to ignore the path.
 */
export type ChokidarIgnoredFunction = (path: string, stats: Stats) => boolean;

export class ChokidarFileWatcher extends AbstractWatcher
{
    private static readonly _DEFAULT_OPTIONS = {
        depth: 2,
        interval: 1000, // Increase the intervals when the chokidar fallbacks to polling,
        binaryInterval: 1000,
        disableGlobbing: true,
        ignoreInitial: true,
        ignorePermissionErrors: true
    };

    private _paths: ChokidarPaths;
    private _options: ChokidarOptions;
    private _watcher: chokidar.FSWatcher | undefined;

    constructor(paths: ChokidarPaths, options?: ChokidarOptions)
    {
        super();
        this._paths = paths;
        this._options = { ...ChokidarFileWatcher._DEFAULT_OPTIONS, ...options };
    }

    public start()
    {
        if (!this._watcher && this._paths)
        {
            this._watcher = chokidar.watch(this._paths, this._options);
            this._watcher.on("all", this._handleWatcherEvent);
        }
    }

    public stop()
    {
        if (this._watcher)
        {
            super.stop();
            this._watcher.close();
            this._watcher = undefined;
        }
    }

    private _handleWatcherEvent = (type: string, path: string) =>
    {
        let eventType: WatcherEvent;
        switch (type)
        {
            case "add":
            case "addDir":
                eventType = WatcherEvent.ADDED;
                break;

            case "change":
                eventType = WatcherEvent.UPDATED;
                break;

            case "unlink":
            case "unlinkDir":
                eventType = WatcherEvent.DELETED;
                break;

            default:
                return;
        }
        this.emit(eventType, path);
        this.emit(WatcherEvent.ALL, path);
    };
}
