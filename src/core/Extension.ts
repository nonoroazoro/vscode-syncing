import * as micromatch from "micromatch";
import { lte } from "semver";
import * as vscode from "vscode";

import { CaseInsensitiveSet } from "../collections";
import { CONFIGURATION_EXCLUDED_EXTENSIONS, CONFIGURATION_KEY } from "../constants";
import { localize } from "../i18n";
import type { IExtension, ISyncedItem } from "../types";
import { getExtensionById, getVSCodeSetting } from "../utils/vscodeAPI";
import * as Toast from "./Toast";

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

    private constructor()
    {}

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
                && !excludedPatterns.some(pattern => micromatch.isMatch(ext.id, pattern, { nocase: true }))
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
    public async sync(extensions: IExtension[], showIndicator = false): Promise<ISyncedItem>
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

        return result as ISyncedItem;
    }

    /**
     * Install or update an extension.
     */
    public async installExtension(extension: IExtension): Promise<IExtension>
    {
        await vscode.commands.executeCommand("workbench.extensions.installExtension", extension.id);
        return extension;
    }

    /**
     * Uninstall an extension.
     */
    public async uninstallExtension(extension: IExtension): Promise<IExtension>
    {
        await vscode.commands.executeCommand("workbench.extensions.uninstallExtension", extension.id);
        return extension;
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
            // Find added, updated and reserved extensions.
            const reservedExtensionIDs = new CaseInsensitiveSet<string>();
            for (const ext of extensions)
            {
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
                    // Remove local extension.
                    result.removed.push(ext);
                }
            }

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
                    Toast.showSpinner(localize("toast.settings.installing.extension", item.id), steps, total);
                }
                await this.installExtension(item);

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
                    Toast.showSpinner(localize("toast.settings.updating.extension", item.id), steps, total);
                }
                await this.installExtension(item);

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
