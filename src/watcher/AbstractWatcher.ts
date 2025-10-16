import { EventEmitter } from "node:events";

export enum WatcherEvent
{
    ALL = "all",

    ADDED = "added",
    UPDATED = "updated",
    DELETED = "deleted"
}

export abstract class AbstractWatcher<EventType extends string | symbol = WatcherEvent>
{
    private _isPaused = false;
    private _emitter = new EventEmitter();

    protected emit(event: EventType, ...args: unknown[]): boolean
    {
        if (this._isPaused)
        {
            return false;
        }
        return this._emitter.emit(event, ...args);
    }

    public stop(): void
    {
        this._emitter.removeAllListeners();
    }

    public pause(): void
    {
        this._isPaused = true;
    }

    public resume(): void
    {
        this._isPaused = false;
    }

    public on(event: EventType, fn: (...args: unknown[]) => void): this
    {
        this._emitter.on(event, fn);
        return this;
    }

    public abstract start(): void;
}
