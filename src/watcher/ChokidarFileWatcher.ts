import { watch } from "chokidar";
import type { ChokidarOptions, FSWatcher } from "chokidar";

import { WatcherEvent, AbstractWatcher } from "./AbstractWatcher";

export class ChokidarFileWatcher extends AbstractWatcher
{
    private static readonly _DEFAULT_OPTIONS: ChokidarOptions = {
        depth: 2,
        interval: 1000, // Increase the intervals when the chokidar fallbacks to polling,
        binaryInterval: 1000,
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
