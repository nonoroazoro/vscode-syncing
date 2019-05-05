import { EventEmitter } from "events";

export enum WatcherEvent
{
    ALL = "all",

    ADDED = "added",
    UPDATED = "updated",
    DELETED = "deleted"
}

export abstract class AbstractWatcher<EventType extends string | symbol = WatcherEvent>
{
    private _emitter = new EventEmitter();

    public stop(): void
    {
        this._emitter.removeAllListeners();
    }

    public on(event: EventType, fn: (...args: any[]) => void): this
    {
        this._emitter.on(event, fn);
        return this;
    }

    protected emit(event: EventType, ...args: any[]): boolean
    {
        return this._emitter.emit(event, ...args);
    }

    public abstract start(): void;
}
