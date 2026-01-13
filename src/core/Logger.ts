import * as vscode from "vscode";

import { EXTENSION_NAME } from "../constants";
import { registerOutputChannel } from "../utils/vscodeAPI";

/**
 * `Syncing` logger.
 */
export class Logger implements Pick<vscode.LogOutputChannel, "info" | "error">
{
    private static _instance: Logger;

    private _outputChannel: vscode.LogOutputChannel;

    private constructor(context: vscode.ExtensionContext)
    {
        this._outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME, { log: true });
        registerOutputChannel(context, this._outputChannel);
    }

    /**
     * Initialize the singleton instance of {@link Logger}.
     */
    public static initialize(context: vscode.ExtensionContext)
    {
        if (!Logger._instance)
        {
            Logger._instance = new Logger(context);
        }
        return Logger._instance;
    }

    /**
     * Get the singleton instance of {@link Logger}.
     */
    public static get instance()
    {
        if (!Logger._instance)
        {
            throw new Error("Logger is not initialized, please call Logger.initialize() first.");
        }
        return Logger._instance;
    }

    public info(message: string, ...args: unknown[])
    {
        this._outputChannel.info(message, ...args);
    }

    public error(error: string | Error, ...args: unknown[])
    {
        this._outputChannel.error(error, ...args);
    }
}
