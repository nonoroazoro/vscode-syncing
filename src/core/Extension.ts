import { lte } from "semver";
import * as extractZip from "extract-zip";
import * as fs from "fs-extra";
import * as micromatch from "micromatch";
import * as path from "path";
import * as tmp from "tmp-promise";
import * as vscode from "vscode";

import { CaseInsensitiveMap, CaseInsensitiveSet } from "../collections";
import
{
    CONFIGURATION_EXCLUDED_EXTENSIONS,
    CONFIGURATION_EXTENSIONS_AUTOUPDATE,
    CONFIGURATION_KEY
} from "../constants";
import { downloadFile } from "../utils/ajax";
import { Environment } from "./Environment";
import { getExtensionById, getVSCodeSetting } from "../utils/vscodeAPI";
import { findLatestSupportedVSIXVersion, queryExtensions } from "../utils/vscodeWebAPI";
import { localize } from "../i18n";
import { Syncing } from "./Syncing";
import * as Toast from "./Toast";
import type { IExtension, ExtensionMeta, ISyncedItem } from "../types";

tmp.setGracefulCleanup();

/**
 * Represents the options of synchronization.
 */
interface ISyncOptions
{
    /**
     * The extensions to add, update or remove.
     */
    extensions: IExtension[];

    /**
     * The current progress of this synchronization process.
     */
    progress: number;

    /**
     * The total progress of this synchronization process.
     */
    total: number;

    /**
     * Sets a value indicating whether `Syncing` should show the progress indicator. Defaults to `false`.
     */
    showIndicator?: boolean;
}

/**
 * VSCode extension wrapper.
 */
export class Extension
{
    private static _instance: Extension;

    private _env: Environment;
    private _syncing: Syncing;

    private constructor()
    {
        this._env = Environment.create();
        this._syncing = Syncing.create();
    }

    /**
     * Creates an instance of the singleton class `Extension`.
     */
    public static create(): Extension
    {
        if (!Extension._instance)
        {
            Extension._instance = new Extension();
        }
        return Extension._instance;
    }

    /**
     * Gets all installed extensions (Disabled extensions aren't included).
     *
     * @param excludedPatterns The glob patterns of the extensions that should be excluded.
     */
    public getAll(excludedPatterns: string[] = []): IExtension[]
    {
        let item: IExtension;
        const result: IExtension[] = [];
        for (const ext of vscode.extensions.all)
        {
            if (
                !ext.packageJSON.isBuiltin
                && !excludedPatterns.some((pattern) => micromatch.isMatch(ext.id, pattern, { nocase: true }))
            )
            {
                item = {
                    id: ext.id,
                    name: ext.packageJSON.name,
                    publisher: ext.packageJSON.publisher,
                    version: ext.packageJSON.version
                };
                result.push(item);
            }
        }
        return result.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    }

    /**
     * Synchronize extensions (add, update or remove).
     *
     * @param extensions Extensions to be synced.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    public async sync(extensions: IExtension[], showIndicator: boolean = false): Promise<ISyncedItem>
    {
        const diff = await this._getDifferentExtensions(extensions);

        // Add, update or remove extensions.
        const { added, updated, removed, total } = diff;
        const result = { extension: {} };
        const tasks = [
            this._addExtensions.bind(this, {
                extensions: added,
                progress: 0,
                total,
                showIndicator
            }),
            this._updateExtensions.bind(this, {
                extensions: updated,
                progress: added.length,
                total,
                showIndicator
            }),
            this._removeExtensions.bind(this, {
                extensions: removed,
                progress: added.length + updated.length,
                total,
                showIndicator
            })
        ];

        for (const task of tasks)
        {
            const value = await task();
            Object.assign(result.extension, value);
        }

        if (showIndicator)
        {
            Toast.clearSpinner("");
        }

        if (total > 0)
        {
            // Added since VSCode v1.20.
            await this.removeVSCodeExtensionFiles();
        }

        return result as ISyncedItem;
    }

    /**
     * Downloads extension from VSCode marketplace.
     */
    public async downloadExtension(extension: IExtension): Promise<IExtension>
    {
        const filepath = (await tmp.file({ postfix: `.${extension.id}.zip` })).path;

        // Calculates the VSIX download URL.
        extension.downloadURL =
            `https://${extension.publisher}.gallery.vsassets.io/_apis/public/gallery/`
            + `publisher/${extension.publisher}/extension/${extension.name}/${extension.version}/`
            + "assetbyname/Microsoft.VisualStudio.Services.VSIXPackage?install=true";

        await downloadFile(extension.downloadURL, filepath, this._syncing.proxy);
        return { ...extension, vsixFilepath: filepath };
    }

    /**
     * Extracts (install) extension vsix package.
     */
    public async extractExtension(extension: IExtension): Promise<IExtension>
    {
        const { vsixFilepath } = extension;
        if (vsixFilepath != null)
        {
            let dirPath: string;
            try
            {
                // Create temp dir.
                dirPath = (await tmp.dir({ postfix: `.${extension.id}`, unsafeCleanup: true })).path;
            }
            catch
            {
                throw new Error(localize("error.extract.extension-2", extension.id));
            }

            try
            {
                // Extract extension to temp dir.
                await extractZip(vsixFilepath, { dir: dirPath });

                // Copy to vscode extension dir.
                const extPath = this._env.getExtensionDirectory(extension);
                await fs.emptyDir(extPath);
                await fs.copy(path.join(dirPath, "extension"), extPath);
                return extension;
            }
            catch (err: any)
            {
                throw new Error(localize("error.extract.extension-1", extension.id, err.message));
            }
        }

        throw new Error(localize("error.extract.extension-3", extension.id));
    }

    /**
     * Uninstall extension.
     */
    public async uninstallExtension(extension: IExtension): Promise<IExtension>
    {
        const localExtension = getExtensionById(extension.id);
        const extensionPath = localExtension
            ? localExtension.extensionPath
            : this._env.getExtensionDirectory(extension);
        try
        {
            await fs.remove(extensionPath);
            return extension;
        }
        catch
        {
            throw new Error(localize("error.uninstall.extension", extension.id));
        }
    }

    /**
     * Removes VSCode `.obsolete` and `extensions.json` file.
     */
    public async removeVSCodeExtensionFiles(): Promise<void>
    {
        try
        {
            await fs.remove(this._env.obsoleteFilePath);
        }
        catch { }

        try
        {
            await fs.remove(this._env.extensionsFilePath);
        }
        catch { }
    }

    /**
     * Gets the extensions that will be added, updated or removed.
     */
    private async _getDifferentExtensions(extensions: IExtension[]): Promise<{
        added: IExtension[];
        removed: IExtension[];
        updated: IExtension[];
        total: number;
    }>
    {
        const result = {
            added: [] as IExtension[],
            removed: [] as IExtension[],
            updated: [] as IExtension[],
            get total()
            {
                return this.added.length + this.removed.length + this.updated.length;
            }
        };
        if (extensions)
        {
            // 1. Auto update extensions: Query the latest extensions.
            let queriedExtensions: CaseInsensitiveMap<string, ExtensionMeta> = new CaseInsensitiveMap();
            const autoUpdateExtensions = getVSCodeSetting<boolean>(
                CONFIGURATION_KEY,
                CONFIGURATION_EXTENSIONS_AUTOUPDATE
            );
            if (autoUpdateExtensions)
            {
                queriedExtensions = await queryExtensions(extensions.map((ext) => ext.id), this._syncing.proxy);
            }

            // Find added & updated extensions.
            const reservedExtensionIDs = new CaseInsensitiveSet<string>();
            for (const ext of extensions)
            {
                // 2. Auto update extensions: Update to the latest version.
                if (autoUpdateExtensions)
                {
                    const extensionMeta = queriedExtensions.get(ext.id);
                    if (extensionMeta)
                    {
                        const latestVersion = findLatestSupportedVSIXVersion(extensionMeta);
                        if (latestVersion != null)
                        {
                            ext.version = latestVersion;
                        }
                    }
                }

                const localExtension = getExtensionById(ext.id);
                if (localExtension)
                {
                    if (lte(ext.version, localExtension.packageJSON.version))
                    {
                        // Reserve local extension.
                        reservedExtensionIDs.add(ext.id);
                    }
                    else
                    {
                        // Update local extension.
                        result.updated.push(ext);
                    }
                }
                else
                {
                    // Add new extension.
                    result.added.push(ext);
                }
            }

            // Find removed extensions, but don't remove the extensions that are excluded.
            // Here's the trick: since the `extensions.json` are always synchronized after the `settings.json`,
            // We can safely get the patterns from VSCode.
            const patterns = getVSCodeSetting<string[]>(CONFIGURATION_KEY, CONFIGURATION_EXCLUDED_EXTENSIONS);
            const localExtensions: IExtension[] = this.getAll(patterns);
            for (const ext of localExtensions)
            {
                if (!reservedExtensionIDs.has(ext.id))
                {
                    // Removed.
                    result.removed.push(ext);
                }
            }

            // Release resources.
            queriedExtensions.clear();
            reservedExtensionIDs.clear();
        }
        return result;
    }

    /**
     * Adds extensions.
     */
    private async _addExtensions(options: ISyncOptions): Promise<{
        added: IExtension[];
        addedErrors: IExtension[];
    }>
    {
        const { extensions, progress, showIndicator = false, total } = options;

        let steps: number = progress;
        const result = { added: [] as IExtension[], addedErrors: [] as IExtension[] };
        for (const item of extensions)
        {
            try
            {
                steps++;

                if (showIndicator)
                {
                    Toast.showSpinner(localize("toast.settings.downloading.extension", item.id), steps, total);
                }
                const extension = await this.downloadExtension(item);

                if (showIndicator)
                {
                    Toast.showSpinner(localize("toast.settings.installing.extension", item.id), steps, total);
                }
                await this.extractExtension(extension);

                result.added.push(item);
            }
            catch
            {
                result.addedErrors.push(item);
            }
        }
        return result;
    }

    /**
     * Updates extensions.
     */
    private async _updateExtensions(options: ISyncOptions): Promise<{
        updated: IExtension[];
        updatedErrors: IExtension[];
    }>
    {
        const { extensions, progress, showIndicator = false, total } = options;

        let steps: number = progress;
        const result = { updated: [] as IExtension[], updatedErrors: [] as IExtension[] };
        for (const item of extensions)
        {
            try
            {
                steps++;

                if (showIndicator)
                {
                    Toast.showSpinner(localize("toast.settings.downloading.extension", item.id), steps, total);
                }
                let extension = await this.downloadExtension(item);

                if (showIndicator)
                {
                    Toast.showSpinner(localize("toast.settings.removing.outdated.extension", item.id), steps, total);
                }
                extension = await this.uninstallExtension(extension);

                if (showIndicator)
                {
                    Toast.showSpinner(localize("toast.settings.installing.extension", item.id), steps, total);
                }
                await this.extractExtension(extension);

                result.updated.push(item);
            }
            catch
            {
                result.updatedErrors.push(item);
            }
        }
        return result;
    }

    /**
     * Removes extensions.
     */
    private async _removeExtensions(options: ISyncOptions): Promise<{
        removed: IExtension[];
        removedErrors: IExtension[];
    }>
    {
        const { extensions, progress, showIndicator = false, total } = options;

        let steps: number = progress;
        const result = { removed: [] as IExtension[], removedErrors: [] as IExtension[] };
        for (const item of extensions)
        {
            try
            {
                steps++;

                if (showIndicator)
                {
                    Toast.showSpinner(localize("toast.settings.uninstalling.extension", item.id), steps, total);
                }
                await this.uninstallExtension(item);

                result.removed.push(item);
            }
            catch
            {
                result.removedErrors.push(item);
            }
        }
        return result;
    }
}
