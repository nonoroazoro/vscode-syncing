import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import { IExtension } from "../types/SyncingTypes";

/**
 * VSCode environment wrapper.
 */
export class Environment
{
    private static _instance: Environment;

    private _codeBasePath: string;
    private _codeUserPath: string;
    private _extensionsPath: string;
    private _isInsiders: boolean;
    private _isMac: boolean;
    private _snippetsPath: string;

    private constructor(context: vscode.ExtensionContext)
    {
        this._isMac = process.platform === "darwin";
        this._isInsiders = context.extensionPath.includes("insider");
        this._extensionsPath = path.join(
            os.homedir(),
            this._isInsiders ? ".vscode-insiders" : ".vscode",
            "extensions"
        );
        this._codeBasePath = this._getCodeBasePath(this._isInsiders);
        this._codeUserPath = path.join(this._codeBasePath, "User");
        this._snippetsPath = path.join(this._codeUserPath, "snippets");
    }

    /**
     * Creates an instance of the singleton class `Environment`.
     */
    public static create(context: vscode.ExtensionContext): Environment
    {
        if (!Environment._instance)
        {
            Environment._instance = new Environment(context);
        }
        return Environment._instance;
    }

    /**
     * Gets a value indicating whether the current operating system is `MacOS`.
     */
    public get isMac(): boolean
    {
        return this._isMac;
    }

    /**
     * Gets a value indicating whether the current VSCode is an `Insiders` version.
     */
    public get isInsiders(): boolean
    {
        return this._isInsiders;
    }

    /**
     * Gets the full path of VSCode `extensions directory`.
     */
    public get extensionsPath(): string
    {
        return this._extensionsPath;
    }

    /**
     * Gets the full path of VSCode `settings directory`.
     */
    public get codeBasePath(): string
    {
        return this._codeBasePath;
    }

    /**
     * Gets the full path of VSCode settings `User directory`.
     */
    public get codeUserPath(): string
    {
        return this._codeUserPath;
    }

    /**
     * Gets the full path of VSCode settings `snippets directory`.
     */
    public get snippetsPath(): string
    {
        return this._snippetsPath;
    }

    /**
     * Gets the full path of the snippet from a filename.
     *
     * @param filename The snippet's filename.
     */
    public getSnippetFilePath(filename: string): string
    {
        return path.join(this.snippetsPath, filename);
    }

    /**
     * Gets the directory name of the extension.
     */
    public getExtensionDirectoryName(extension: IExtension): string
    {
        return `${extension.publisher}.${extension.name}-${extension.version}`;
    }

    /**
     * Gets the full path of the extension.
     */
    public getExtensionPath(extension: IExtension): string
    {
        return path.join(this.extensionsPath, this.getExtensionDirectoryName(extension));
    }

    /**
     * Gets the full path of the `.obsolete` file.
     */
    public getObsoleteFilePath(): string
    {
        return path.join(this.extensionsPath, ".obsolete");
    }

    private _getCodeBasePath(isInsiders: boolean): string
    {
        let basePath: string;
        switch (process.platform)
        {
            case "win32":
                basePath = process.env.APPDATA!;
                break;

            case "darwin":
                basePath = path.join(os.homedir(), "Library/Application Support");
                break;

            case "linux":
                basePath = path.join(os.homedir(), ".config");
                break;

            default:
                basePath = "/var/local";
        }
        return path.join(basePath, isInsiders ? "Code - Insiders" : "Code");
    }
}
