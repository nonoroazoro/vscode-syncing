import { AbstractWatcher, WatcherEvent } from "./AbstractWatcher";
import { ChokidarFileWatcher } from "./ChokidarFileWatcher";
import { VSCodeExtensionWatcher } from "./VSCodeExtensionWatcher";

export class SettingsWatcher extends AbstractWatcher<WatcherEvent.ALL>
{
    private _paths: string[];

    private _fileWatcher: ChokidarFileWatcher | undefined;
    private _extensionWatcher: VSCodeExtensionWatcher | undefined;

    constructor(paths: string[])
    {
        super();
        this._paths = paths;
    }

    public async start()
    {
        if (!this._fileWatcher)
        {
            this._fileWatcher = new ChokidarFileWatcher(this._paths);
            this._fileWatcher.on(WatcherEvent.ALL, this._handleWatcherEvent);
        }

        if (!this._extensionWatcher)
        {
            this._extensionWatcher = new VSCodeExtensionWatcher();
            this._extensionWatcher.on(WatcherEvent.ALL, this._handleWatcherEvent);
        }
    }

    public async stop()
    {
        super.stop();
        if (this._fileWatcher)
        {
            this._fileWatcher.stop();
            this._fileWatcher = undefined;
        }
        if (this._extensionWatcher)
        {
            this._extensionWatcher.stop();
            this._extensionWatcher = undefined;
        }
    }

    private _handleWatcherEvent = () =>
    {
        this.emit(WatcherEvent.ALL);
    };
}
