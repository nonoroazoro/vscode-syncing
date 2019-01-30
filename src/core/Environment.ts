import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";

import { localize } from "../i18n";
import { IExtension } from "../types/SyncingTypes";

/**
 * VSCode environment wrapper.
 */
export class Environment
{
    private static _instance: Environment;

    /**
     * The builtin-environments of different VSCode versions.
     *
     * Note: The key will be matched with the `vscode.env.appName`, contains the followings:
     *
     * 1. The VSCode Standard;
     * 2. The VSCode Insiders;
     * 3. The VSCode under FLOSS license, see [VSCodium](https://github.com/VSCodium/vscodium).
     */
    private static _codeEnvironments = {
        "Visual Studio Code": {
            extensionsDirectoryName: ".vscode",
            dataDirectoryName: "Code"
        },
        "Visual Studio Code - Insiders": {
            extensionsDirectoryName: ".vscode-insiders",
            dataDirectoryName: "Code - Insiders"
        },
        "VSCodium": {
            extensionsDirectoryName: ".vscode-oss",
            dataDirectoryName: "VSCodium"
        }
    };

    private _codeMap: { extensionsDirectoryName: string; dataDirectoryName: string; };
    private _codeDataDirectory: string;
    private _codeUserDirectory: string;
    private _extensionsDirectory: string;
    private _isMac: boolean;
    private _isPortable: boolean;
    private _snippetsDirectory: string;

    private constructor()
    {
        // Note that the followings are order-sensitive.
        this._codeMap = Environment._codeEnvironments[vscode.env.appName];
        if (!this._codeMap)
        {
            // Unknown VSCode version.
            throw new Error(localize("error.env.unknown.vscode"));
        }
        this._isMac = process.platform === "darwin";
        this._isPortable = process.env.VSCODE_PORTABLE != null;

        this._extensionsDirectory = this._getCodeExtensionsDirectory();
        this._codeDataDirectory = this._getCodeDataDirectory();
        this._codeUserDirectory = path.join(this._codeDataDirectory, "User");
        this._snippetsDirectory = path.join(this._codeUserDirectory, "snippets");
    }

    /**
     * Creates an instance of the singleton class `Environment`.
     */
    public static create(): Environment
    {
        if (!Environment._instance)
        {
            Environment._instance = new Environment();
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
     * Gets a value indicating whether the VSCode is running in `Portable Mode`.
     */
    public get isPortable(): boolean
    {
        return this._isPortable;
    }

    /**
     * Gets the full path of VSCode `extensions directory`.
     */
    public get extensionsDirectory(): string
    {
        return this._extensionsDirectory;
    }

    /**
     * Gets the full path of VSCode `data directory`.
     */
    public get codeDataDirectory(): string
    {
        return this._codeDataDirectory;
    }

    /**
     * Gets the full path of VSCode settings `user directory`.
     */
    public get codeUserDirectory(): string
    {
        return this._codeUserDirectory;
    }

    /**
     * Gets the full path of VSCode settings `snippets directory`.
     */
    public get snippetsDirectory(): string
    {
        return this._snippetsDirectory;
    }

    /**
     * Gets the full path of the snippet from a filename.
     *
     * @param filename The snippet's filename.
     */
    public getSnippetFilePath(filename: string): string
    {
        return path.join(this.snippetsDirectory, filename);
    }

    /**
     * Gets the full path of the extension.
     */
    public getExtensionDirectory(extension: IExtension): string
    {
        return path.join(this.extensionsDirectory, this.getExtensionDirectoryName(extension));
    }

    /**
     * Gets the directory name of the extension.
     */
    public getExtensionDirectoryName(extension: IExtension): string
    {
        return `${extension.publisher}.${extension.name}-${extension.version}`;
    }

    /**
     * Gets the full path of the `.obsolete` file.
     */
    public getObsoleteFilePath(): string
    {
        return path.join(this.extensionsDirectory, ".obsolete");
    }

    private _getCodeExtensionsDirectory()
    {
        if (this.isPortable)
        {
            // Such as the "/Applications/code-portable-data/extensions" directory in MacOS.
            return path.join(process.env.VSCODE_PORTABLE!, "extensions");
        }
        return path.join(
            os.homedir(),
            this._codeMap.extensionsDirectoryName,
            "extensions"
        );
    }

    private _getCodeDataDirectory(): string
    {
        if (this.isPortable)
        {
            // Such as the "/Applications/code-portable-data/user-data" directory in MacOS.
            return path.join(process.env.VSCODE_PORTABLE!, "user-data");
        }

        let baseDirectory: string;
        switch (process.platform)
        {
            case "win32":
                baseDirectory = process.env.APPDATA!;
                break;

            case "darwin":
                baseDirectory = path.join(os.homedir(), "Library", "Application Support");
                break;

            case "linux":
                baseDirectory = path.join(os.homedir(), ".config");
                break;

            default:
                // TODO: Unknown platform.
                throw new Error(localize("error.not.supported"));
        }
        return path.join(baseDirectory, this._codeMap.dataDirectoryName);
    }
}
