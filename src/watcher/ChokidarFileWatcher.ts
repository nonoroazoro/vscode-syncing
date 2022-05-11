import { watch } from "chokidar";
import type { WatchOptions, FSWatcher } from "chokidar";
import type { Stats } from "fs-extra";

import { WatcherEvent, AbstractWatcher } from "./AbstractWatcher";

/**
 * Returns `true` to ignore the path.
 */
export type ChokidarIgnoredFunction = (path: string, stats: Stats) => boolean;
export type ChokidarOptions = WatchOptions | { ignored?: ChokidarIgnored };
export type ChokidarIgnored = Array<ChokidarIgnoredFunction | string> | ChokidarIgnoredFunction | string;

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

    private _paths: string[] | string;
    private _options: ChokidarOptions;
    private _watcher: FSWatcher | undefined;

    constructor(paths: string[] | string, options?: ChokidarOptions)
    {
        super();
        this._paths = paths;
        this._options = { ...ChokidarFileWatcher._DEFAULT_OPTIONS, ...options };
    }

    public start()
    {
        if (!this._watcher && this._paths)
        {
            this._watcher = watch(this._paths, this._options as any);
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
