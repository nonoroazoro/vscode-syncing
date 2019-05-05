import * as vscode from "vscode";

import { AbstractWatcher, WatcherEvent } from "./AbstractWatcher";

export class VSCodeExtensionWatcher extends AbstractWatcher<WatcherEvent.ALL>
{
    private _watcher: vscode.Disposable | undefined;

    public start()
    {
        if (!this._watcher)
        {
            this._watcher = vscode.extensions.onDidChange(this._handleWatcherEvent);
        }
    }

    public stop()
    {
        if (this._watcher)
        {
            super.stop();
            this._watcher.dispose();
            this._watcher = undefined;
        }
    }

    private _handleWatcherEvent = () =>
    {
        this.emit(WatcherEvent.ALL);
    };
}
