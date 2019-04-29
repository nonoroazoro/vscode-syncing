import * as os from "os";
import * as path from "path";

import { localize } from "../i18n";
import { Platform } from "../types/Platform";
import { IExtension } from "../types/SyncingTypes";
import { getVSCodeBuiltinEnvironment } from "../utils/vscodeAPI";

/**
 * VSCode environment wrapper.
 */
export class Environment
{
    private static _instance: Environment;

    private _isLinux: boolean;
    private _isMac: boolean;
    private _isWindows: boolean;
    private _isPortable: boolean;
    private _platform: Platform;

    private _extensionsDirectory: string;
    private _dataDirectory: string;
    private _userDirectory: string;
    private _snippetsDirectory: string;

    private constructor()
    {
        this._platform = this._getPlatform();
        this._isLinux = (this._platform === Platform.LINUX);
        this._isMac = (this._platform === Platform.MACINTOSH);
        this._isWindows = (this._platform === Platform.WINDOWS);
        this._isPortable = (process.env.VSCODE_PORTABLE != null);

        this._extensionsDirectory = this._getExtensionsDirectory(this._isPortable);
        this._dataDirectory = this._getDataDirectory(this._isPortable, this._platform);
        this._userDirectory = path.join(this._dataDirectory, "User");
        this._snippetsDirectory = path.join(this._userDirectory, "snippets");
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
     * Gets a value indicating whether the current operating system is `Linux`.
     */
    public get isLinux(): boolean
    {
        return this._isLinux;
    }

    /**
     * Gets a value indicating whether the current operating system is `Macintosh`.
     */
    public get isMac(): boolean
    {
        return this._isMac;
    }

    /**
     * Gets a value indicating whether the current operating system is `Windows`.
     */
    public get isWindows(): boolean
    {
        return this._isWindows;
    }

    /**
     * Gets a value indicating the type of the current operating system.
     */
    public get platform(): Platform
    {
        return this._platform;
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
    public get dataDirectory(): string
    {
        return this._dataDirectory;
    }

    /**
     * Gets the full path of VSCode `user directory`.
     */
    public get userDirectory(): string
    {
        return this._userDirectory;
    }

    /**
     * Gets the full path of VSCode `snippets directory`.
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
     * Gets the full path of the `.obsolete` file.
     */
    public getObsoleteFilePath(): string
    {
        return path.join(this.extensionsDirectory, ".obsolete");
    }

    /**
     * Gets the directory of the extension.
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
     * Gets the extensions directory of VSCode.
     */
    private _getExtensionsDirectory(isPortable: boolean)
    {
        if (isPortable)
        {
            // Such as the "/Applications/code-portable-data/extensions" directory in MacOS.
            return path.join(process.env.VSCODE_PORTABLE!, "extensions");
        }
        return path.join(
            os.homedir(),
            getVSCodeBuiltinEnvironment().extensionsDirectoryName,
            "extensions"
        );
    }

    /**
     * Gets the data directory of VSCode.
     */
    private _getDataDirectory(isPortable: boolean, platform: Platform): string
    {
        if (isPortable)
        {
            // Such as the "/Applications/code-portable-data/user-data" directory in MacOS.
            return path.join(process.env.VSCODE_PORTABLE!, "user-data");
        }
        const { dataDirectoryName } = getVSCodeBuiltinEnvironment();
        switch (platform)
        {
            case Platform.WINDOWS:
                return path.join(process.env.APPDATA!, dataDirectoryName);

            case Platform.MACINTOSH:
                return path.join(
                    os.homedir(),
                    "Library",
                    "Application Support",
                    dataDirectoryName
                );

            default:
            case Platform.LINUX:
                return path.join(
                    os.homedir(),
                    ".config",
                    dataDirectoryName
                );
        }
    }

    /**
     * Gets the current running platform.
     *
     * @throws {Error} Throws an error when the platform is unknown.
     */
    private _getPlatform()
    {
        if (process.platform === "linux")
        {
            return Platform.LINUX;
        }
        if (process.platform === "darwin")
        {
            return Platform.MACINTOSH;
        }
        if (process.platform === "win32")
        {
            return Platform.WINDOWS;
        }
        throw new Error(localize("error.env.platform.not.supported"));
    }
}
