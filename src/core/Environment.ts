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
    /**
     * Gets a value indicating whether the current operating system is `Linux`.
     */
    public readonly isLinux: boolean;

    /**
     * Gets a value indicating whether the current operating system is `Macintosh`.
     */
    public readonly isMac: boolean;

    /**
     * Gets a value indicating whether the current operating system is `Windows`.
     */
    public readonly isWindows: boolean;

    /**
     * Gets a value indicating whether the VSCode is running in `Portable Mode`.
     */
    public readonly isPortable: boolean;

    /**
     * Gets a value indicating the type of the current operating system.
     */
    public readonly platform: Platform;

    /**
     * Gets the full path of VSCode's `extensions directory`.
     */
    public readonly extensionsDirectory: string;

    /**
     * Gets the full path of VSCode's `data directory`.
     */
    public readonly dataDirectory: string;

    /**
     * Gets the full path of VSCode's `user directory`.
     */
    public readonly userDirectory: string;

    /**
     * Gets the full path of VSCode's `snippets directory`.
     */
    public readonly snippetsDirectory: string;

    /**
     * Gets the full path of VSCode's `.obsolete file`.
     */
    public readonly obsoleteFilePath: string;

    private static _instance: Environment;

    private constructor()
    {
        this.platform = this._getPlatform();
        this.isLinux = (this.platform === Platform.LINUX);
        this.isMac = (this.platform === Platform.MACINTOSH);
        this.isWindows = (this.platform === Platform.WINDOWS);
        this.isPortable = (process.env.VSCODE_PORTABLE != null);

        this.extensionsDirectory = this._getExtensionsDirectory(this.isPortable);
        this.dataDirectory = this._getDataDirectory(this.isPortable, this.platform);
        this.userDirectory = path.join(this.dataDirectory, "User");
        this.snippetsDirectory = this.getSettingsFilePath("snippets");
        this.obsoleteFilePath = path.join(this.extensionsDirectory, ".obsolete");
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
     * Gets the full path of the snippet from a filename.
     *
     * @param filename The snippet's filename.
     */
    public getSnippetFilePath(filename: string): string
    {
        return path.join(this.snippetsDirectory, filename);
    }

    /**
     * Gets the full path of the settings from a filename.
     *
     * @param filename The settings filename.
     */
    public getSettingsFilePath(filename: string): string
    {
        return path.join(this.userDirectory, filename);
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
