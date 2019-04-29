import { EventEmitter } from "events";

export enum FileWatcherEvent
{
    ADDED = "added",
    CHANGED = "changed",
    DELETED = "deleted"
}

export abstract class AbstractFileWatcher
{
    private _emitter = new EventEmitter();

    public on(event: FileWatcherEvent, fn: (...args: any[]) => void): this
    {
        this._emitter.on(event, fn);
        return this;
    }

    public off(event: FileWatcherEvent, fn: (...args: any[]) => void): this
    {
        this._emitter.off(event, fn);
        return this;
    }

    protected emit(event: FileWatcherEvent, ...args: any[]): boolean
    {
        return this._emitter.emit(event, ...args);
    }

    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
}
