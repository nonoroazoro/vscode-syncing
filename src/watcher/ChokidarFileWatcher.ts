import * as chokidar from "chokidar";

import { AbstractFileWatcher } from "./AbstractFileWatcher";
import { WatcherEvent } from "./AbstractWatcher";

export class ChokidarFileWatcher extends AbstractFileWatcher
{
    private static readonly DEFAULT_OPTIONS = {
        depth: 2,
        interval: 1000, // Increase the intervals when the chokidar fallbacks to polling,
        binaryInterval: 1000,
        disableGlobbing: true,
        ignoreInitial: true,
        ignorePermissionErrors: true
    };

    private _paths: string | string[];
    private _options: chokidar.WatchOptions;
    private _watcher: chokidar.FSWatcher | undefined;

    constructor(paths: string | string[], options?: chokidar.WatchOptions)
    {
        super();
        this._paths = paths;
        this._options = { ...ChokidarFileWatcher.DEFAULT_OPTIONS, ...options };
    }

    public async start()
    {
        if (!this._watcher && this._paths)
        {
            this._watcher = chokidar.watch(this._paths, this._options);
            this._watcher.on("all", this._handleWatcherEvent);
        }
    }

    public async stop()
    {
        if (this._watcher)
        {
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
