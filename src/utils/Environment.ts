import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

/**
 * vscode's environment.
 */
export default class Environment
{
    private static _instance: Environment;

    private _codeBasePath: string;
    private _codeUserPath: string;
    private _extensionsPath: string;
    private _isInsiders: boolean;
    private _isMac: boolean;
    private _snippetsPath: string;
    private _syncingSettingsPath: string;

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
        this._syncingSettingsPath = path.join(this._codeUserPath, "syncing.json");
    }

    /**
     * create instance of Singleton class `Environment`.
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
     * check if mac.
     */
    public get isMac(): boolean
    {
        return this._isMac;
    }

    /**
     * check if vscode is an insiders version.
     */
    public get isInsiders(): boolean
    {
        return this._isInsiders;
    }

    /**
     * get vscode's extensions base path.
     */
    public get extensionsPath(): string
    {
        return this._extensionsPath;
    }

    /**
     * get vscode's config base path.
     */
    public get codeBasePath(): string
    {
        return this._codeBasePath;
    }

    /**
     * get vscode's config `User` path.
     */
    public get codeUserPath(): string
    {
        return this._codeUserPath;
    }

    /**
     * get vscode's config `snippets` path.
     */
    public get snippetsPath(): string
    {
        return this._snippetsPath;
    }

    /**
     * get Syncing's config file path.
     */
    public get syncingSettingPath(): string
    {
        return this._syncingSettingsPath;
    }

    /**
     * get local snippet filepath from filename.
     * @param {string} filename snippet filename.
     */
    public getSnippetFilePath(filename: string): string
    {
        return path.join(this.snippetsPath, filename);
    }

    /**
     * get proxy settings for Syncing, using vscode's `http.proxy`.
     */
    public getSyncingProxy(): string
    {
        return vscode.workspace.getConfiguration("http")["proxy"];
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
                basePath = path.join(process.env.HOME!, "Library/Application Support");
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
