import * as vscode from "vscode";

import { AbstractWatcher } from "./AbstractWatcher";

export enum ExtensionWatcherEvent
{
    ALL = "all"
}

export class VSCodeExtensionWatcher extends AbstractWatcher<ExtensionWatcherEvent>
{
    private _watcher: vscode.Disposable | undefined;

    public async start()
    {
        if (!this._watcher)
        {
            this._watcher = vscode.extensions.onDidChange(this._handleWatcherEvent);
        }
    }

    public async stop()
    {
        if (this._watcher)
        {
            this._watcher.dispose();
            this._watcher = undefined;
        }
    }

    private _handleWatcherEvent = () =>
    {
        this.emit(ExtensionWatcherEvent.ALL);
    };
}
