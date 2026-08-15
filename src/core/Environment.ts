import * as path from "node:path";
import * as vscode from "vscode";

import type { ExtensionContext } from "vscode";

import { Logger } from "./Logger";
import { localize } from "../i18n";
import { Platform } from "../types";

import type { IExtension } from "../types";

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
     * Gets a value indicating whether the extension is running in a remote extension host.
     */
    public readonly isRemote: boolean;

    /**
     * Gets a value indicating the type of the current operating system.
     */
    public readonly platform: Platform;

    /**
     * Gets the full path of VSCode's `user directory`.
     */
    public readonly userDirectory: string;

    /**
     * Gets the full path of VSCode's settings directory for the current extension host.
     */
    public readonly settingsDirectory: string;

    /**
     * Gets the full path of VSCode's `extensions directory`.
     */
    public readonly extensionsDirectory: string;

    /**
     * Gets the full path of VSCode's `snippets directory`.
     */
    public readonly snippetsDirectory: string;

    private static _instance: Environment;

    private constructor(context: {
        extensionUri: Pick<ExtensionContext["extensionUri"], "fsPath">;
        globalStorageUri: Pick<ExtensionContext["globalStorageUri"], "fsPath">;
    })
    {
        this.platform = this._getPlatform();
        this.isLinux = this.platform === Platform.LINUX;
        this.isMac = this.platform === Platform.MACINTOSH;
        this.isWindows = this.platform === Platform.WINDOWS;
        this.isPortable = process.env.VSCODE_PORTABLE != null;
        this.isRemote = vscode.env.remoteName != null;

        this.userDirectory = path.dirname(path.dirname(context.globalStorageUri.fsPath));
        Logger.instance.info("UserDirectory", this.userDirectory);

        this.settingsDirectory = this.isRemote
            ? path.join(path.dirname(this.userDirectory), "Machine")
            : this.userDirectory;
        Logger.instance.info("SettingsDirectory", this.settingsDirectory);

        this.extensionsDirectory = this._getExtensionsDirectory(this.isPortable, context.extensionUri.fsPath);
        Logger.instance.info("ExtensionsDirectory", this.extensionsDirectory);

        this.snippetsDirectory = this.getUserFilePath("snippets");
        Logger.instance.info("SnippetsDirectory", this.snippetsDirectory);
    }

    /**
     * Initialize the singleton instance of {@link Environment}.
     */
    public static initialize(context: {
        extensionUri: Pick<ExtensionContext["extensionUri"], "fsPath">;
        globalStorageUri: Pick<ExtensionContext["globalStorageUri"], "fsPath">;
    })
    {
        if (!Environment._instance)
        {
            Environment._instance = new Environment(context);
        }
    }

    /**
     * Get the singleton instance of {@link Environment}.
     */
    public static get instance()
    {
        if (!Environment._instance)
        {
            throw new Error("Environment is not initialized, please call Environment.initialize() first.");
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
        return path.join(this.settingsDirectory, filename);
    }

    /**
     * Gets the full path of a file in VSCode's user directory.
     *
     * @param filename The user filename.
     */
    public getUserFilePath(filename: string): string
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
    private _getExtensionsDirectory(isPortable: boolean, extensionPath: string)
    {
        if (isPortable)
        {
            // Such as the "/Applications/code-portable-data/extensions" directory in MacOS.
            return path.join(process.env.VSCODE_PORTABLE ?? "", "extensions");
        }
        return path.dirname(extensionPath);
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
