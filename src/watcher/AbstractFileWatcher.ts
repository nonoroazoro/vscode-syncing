import { AbstractWatcher } from "./AbstractWatcher";

export abstract class AbstractFileWatcher extends AbstractWatcher
{
    abstract start(): Promise<void>;
    abstract stop(): Promise<void>;
}
