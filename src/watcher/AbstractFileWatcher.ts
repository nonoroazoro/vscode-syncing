import { AbstractWatcher } from "./AbstractWatcher";

export enum FileWatcherEvent
{
    ADDED = "added",
    CHANGED = "changed",
    DELETED = "deleted"
}

export abstract class AbstractFileWatcher extends AbstractWatcher<FileWatcherEvent>
{
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
}
