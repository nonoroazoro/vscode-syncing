import * as chokidar from "chokidar";

import { AbstractFileWatcher, FileWatcherEvent } from "./AbstractFileWatcher";

/**
 * TODO: Still not work on Mac yet.
 */
export class ChokidarFileWatcher extends AbstractFileWatcher
{
    private _paths: string | string[];
    private _watcher: any;

    constructor(paths: string | string[])
    {
        super();
        this._paths = paths;
    }

    async start()
    {
        if (!this._watcher && this._paths)
        {
            this._watcher = chokidar.watch(this._paths, {
                depth: 2,
                ignoreInitial: true,
                interval: 1000, // Increase the intervals when the chokidar fallbacks to polling,
                binaryInterval: 1000,
                disableGlobbing: true
            });
            this._watcher.on("all", this._handleWatcherEvent);
        }
    }

    async stop()
    {
        if (this._watcher)
        {
            this._watcher.dispose();
            this._watcher = undefined;
        }
    }

    private _handleWatcherEvent(type: string, path: string)
    {
        let eventType: FileWatcherEvent;
        switch (type)
        {
            case "add":
            case "addDir":
                eventType = FileWatcherEvent.ADDED;
                break;

            case "change":
                eventType = FileWatcherEvent.CHANGED;
                break;

            case "unlink":
            case "unlinkDir":
                eventType = FileWatcherEvent.DELETED;
                break;

            default:
                return;
        }
        console.info(eventType, path);
        this.emit(eventType, path);
    }
}
