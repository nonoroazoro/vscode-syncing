import * as async from "async";
import * as extractZip from "extract-zip";
import * as fs from "fs-extra";
import * as minimatch from "minimatch";
import * as path from "path";
import * as tmp from "tmp";
import * as vscode from "vscode";

import { CaseInsensitiveMap } from "../common/CaseInsensitiveMap";
import { CaseInsensitiveSet } from "../common/CaseInsensitiveSet";
import { CONFIGURATION_EXCLUDED_EXTENSIONS, CONFIGURATION_EXTENSIONS_AUTOUPDATE, CONFIGURATION_KEY } from "../common/constants";
import { IExtension, ISyncedItem } from "../common/types";
import { IExtensionMeta } from "../common/VSCodeWebAPITypes";
import { downloadFile } from "../utils/ajax";
import { getExtensionById, getVSCodeSetting } from "../utils/vscodeAPI";
import { getVSIXPackageURL, queryExtensions } from "../utils/vscodeWebAPI";
import { Environment } from "./Environment";
import { Syncing } from "./Syncing";
import * as Toast from "./Toast";

tmp.setGracefulCleanup();

/**
 * Represents the options of synchronization.
 */
interface ISyncOptions
{
    /**
     * Extensions to add/update/remove.
     */
    extensions: IExtension[];

    /**
     * Progress of the synchronization of all extensions.
     */
    progress: number;

    /**
     * Total progress of the synchronization of all extensions.
     */
    total: number;

    /**
     * Whether to show the progress indicator. Defaults to `false`.
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

    private constructor(context: vscode.ExtensionContext)
    {
        this._env = Environment.create(context);
        this._syncing = Syncing.create(context);
    }

    /**
     * Creates an instance of singleton class `Extension`.
     */
    public static create(context: vscode.ExtensionContext): Extension
    {
        if (!Extension._instance)
        {
            Extension._instance = new Extension(context);
        }
        return Extension._instance;
    }

    /**
     * Gets all installed extensions (Disabled extensions aren't included).
     *
     * @param excludedExtensions The extensions that should be excluded from the result.
     */
    public getAll(excludedExtensions: string[] = []): IExtension[]
    {
        let item: IExtension;
        const result: IExtension[] = [];
        for (const ext of vscode.extensions.all)
        {
            if (
                !ext.packageJSON.isBuiltin
                && !excludedExtensions.some((pattern) => minimatch(ext.id, pattern, { nocase: true }))
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
        return result;
    }

    /**
     * Sync extensions (add/update/remove).
     *
     * @param extensions Extensions to be synced.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    public sync(extensions: IExtension[], showIndicator: boolean = false): Promise<ISyncedItem>
    {
        return new Promise((resolve) =>
        {
            this._getDifferentExtensions(extensions).then((diff) =>
            {
                // Add/update/remove extensions.
                const { added, updated, removed, total } = diff;
                const result = { extension: {} } as ISyncedItem;
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
                async.eachSeries(
                    tasks,
                    (task, done) =>
                    {
                        task().then((value: any) =>
                        {
                            Object.assign(result.extension, value);
                            done();
                        });
                    },
                    () =>
                    {
                        if (showIndicator)
                        {
                            Toast.clearSpinner("");
                        }

                        // Added since VSCode v1.20.
                        this.upgradeObsolete(added, updated, removed).then(() => resolve(result));
                    }
                );
            });
        });
    }

    /**
     * Downloads extension from VSCode marketplace.
     */
    public downloadExtension(extension: IExtension): Promise<IExtension>
    {
        return new Promise((resolve, reject) =>
        {
            // Create a temporary file, the file will be automatically closed and unlinked on process exit.
            tmp.file({ postfix: `.${extension.id}.zip` }, (err, filepath: string) =>
            {
                if (err)
                {
                    reject(err);
                    return;
                }

                // Fallback to normal package.
                if (!extension.downloadURL)
                {
                    extension.downloadURL = `https://${extension.publisher}.gallery.vsassets.io/_apis/public/gallery/`
                        + `publisher/${extension.publisher}/extension/${extension.name}/${extension.version}`
                        + `/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`;
                }
                downloadFile(extension.downloadURL, filepath, this._syncing.proxy).then(() =>
                {
                    resolve({ ...extension, zip: filepath });
                }).catch(reject);
            });
        });
    }

    /**
     * Extracts extension zip file to VSCode extensions folder.
     */
    public extractExtension(extension: IExtension): Promise<IExtension>
    {
        return new Promise((resolve, reject) =>
        {
            const zipFilepath = extension.zip;
            if (zipFilepath)
            {
                tmp.dir({ postfix: `.${extension.id}`, unsafeCleanup: true }, (err1, dirPath: string) =>
                {
                    if (err1)
                    {
                        reject(`Cannot extract extension: ${extension.id}. Access temporary directory denied.`);
                    }
                    else
                    {
                        extractZip(zipFilepath, { dir: dirPath }, (err2) =>
                        {
                            if (err2)
                            {
                                reject(`Cannot extract extension: ${extension.id}. ${err2.message}`);
                            }
                            else
                            {
                                const extPath = this._env.getExtensionPath(extension);
                                fs.emptyDir(extPath)
                                    .then(() =>
                                    {
                                        return fs.copy(path.join(dirPath, "extension"), extPath);
                                    })
                                    .then(() =>
                                    {
                                        resolve({ ...extension, path: extPath });
                                    })
                                    .catch((err3) =>
                                    {
                                        reject(`Cannot extract extension: ${extension.id}. ${err3.message}`);
                                    });
                            }
                        });
                    }
                });
            }
            else
            {
                reject(`Cannot extract extension: ${extension.id}. Extension zip file not found.`);
            }
        });
    }

    /**
     * Uninstall extension.
     */
    public async uninstallExtension(extension: IExtension): Promise<IExtension>
    {
        const localExtension = getExtensionById(extension.id);
        const extensionPath = localExtension ? localExtension.extensionPath : this._env.getExtensionPath(extension);
        try
        {
            await fs.remove(extensionPath);
        }
        catch (err)
        {
            throw new Error(`Cannot uninstall extension: ${extension.id}`);
        }
        return extension;
    }

    /**
     * Upgrade VSCode '.obsolete' file.
     */
    public async upgradeObsolete(added: IExtension[] = [], removed: IExtension[] = [], updated: IExtension[] = []): Promise<void>
    {
        const filepath = this._env.getObsoleteFilePath();
        let obsolete: { [extensionFolderName: string]: boolean; } | undefined;
        try
        {
            obsolete = await fs.readJson(filepath);
        }
        catch (err)
        {
        }

        if (obsolete)
        {
            for (const ext of [...added, ...updated])
            {
                delete obsolete[this._env.getExtensionFolderName(ext)];
            }

            for (const ext of removed)
            {
                obsolete[this._env.getExtensionFolderName(ext)] = true;
            }

            try
            {
                if (Object.keys(obsolete).length > 0)
                {
                    await fs.outputJson(filepath, obsolete);
                }
                else
                {
                    await fs.remove(filepath);
                }
            }
            catch (err)
            {
            }
        }
    }

    /**
     * Gets extensions that are added/updated/removed.
     */
    private async _getDifferentExtensions(extensions: IExtension[]): Promise<{
        added: IExtension[],
        removed: IExtension[],
        updated: IExtension[],
        total: number
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
            // 1. Automatically update extensions: Query the latest extensions.
            let queriedExtensions: CaseInsensitiveMap<string, IExtensionMeta> = new CaseInsensitiveMap();
            const autoUpdateExtensions = getVSCodeSetting<boolean>(CONFIGURATION_KEY, CONFIGURATION_EXTENSIONS_AUTOUPDATE);
            if (autoUpdateExtensions)
            {
                queriedExtensions = await queryExtensions(extensions.map((ext) => ext.id), this._syncing.proxy);
            }

            // Find added & updated extensions.
            const reservedExtensionIDs = new CaseInsensitiveSet<string>();
            for (const ext of extensions)
            {
                // 2. Automatically update extensions: Update to the latest version.
                if (autoUpdateExtensions)
                {
                    const extensionMeta = queriedExtensions.get(ext.id);
                    if (extensionMeta)
                    {
                        const versionMeta = extensionMeta.versions[0];
                        if (versionMeta)
                        {
                            const version = versionMeta.version;
                            const vsixPackageURL = getVSIXPackageURL(versionMeta);
                            if (version && vsixPackageURL)
                            {
                                ext.version = version;
                                ext.downloadURL = vsixPackageURL;
                            }
                        }
                    }
                }
                const localExtension = getExtensionById(ext.id);
                if (localExtension)
                {
                    if (localExtension.packageJSON.version === ext.version)
                    {
                        // Reserved.
                        reservedExtensionIDs.add(ext.id);
                    }
                    else
                    {
                        // Updated.
                        result.updated.push(ext);
                    }
                }
                else
                {
                    // Added.
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
    private _addExtensions(options: ISyncOptions): Promise<{ added: IExtension[], addedErrors: IExtension[] }>
    {
        return new Promise((resolve) =>
        {
            const { extensions, progress, showIndicator = false, total } = options;

            let steps: number = progress;
            const result = { added: [] as IExtension[], addedErrors: [] as IExtension[] };
            async.eachSeries(
                extensions,
                (item, done) =>
                {
                    steps++;

                    if (showIndicator)
                    {
                        Toast.showSpinner(`Syncing: Downloading extension: ${item.id}`, steps, total);
                    }

                    this.downloadExtension(item)
                        .then((extension) =>
                        {
                            if (showIndicator)
                            {
                                Toast.showSpinner(`Syncing: Installing extension: ${item.id}`, steps, total);
                            }
                            return this.extractExtension(extension);
                        })
                        .then(() =>
                        {
                            result.added.push(item);
                            done();
                        })
                        .catch(() =>
                        {
                            result.addedErrors.push(item);
                            done();
                        });
                },
                () =>
                {
                    resolve(result);
                }
            );
        });
    }

    /**
     * Updates extensions.
     */
    private _updateExtensions(options: ISyncOptions): Promise<{ updated: IExtension[], updatedErrors: IExtension[] }>
    {
        return new Promise((resolve) =>
        {
            const { extensions, progress, showIndicator = false, total } = options;

            let steps: number = progress;
            const result = { updated: [] as IExtension[], updatedErrors: [] as IExtension[] };
            async.eachSeries(
                extensions,
                (item, done) =>
                {
                    steps++;

                    if (showIndicator)
                    {
                        Toast.showSpinner(`Syncing: Downloading extension: ${item.id}`, steps, total);
                    }

                    this.downloadExtension(item)
                        .then((extension) =>
                        {
                            if (showIndicator)
                            {
                                Toast.showSpinner(`Syncing: Removing outdated extension: ${item.id}`, steps, total);
                            }
                            return this.uninstallExtension(extension);
                        })
                        .then((extension) =>
                        {
                            if (showIndicator)
                            {
                                Toast.showSpinner(`Syncing: Installing extension: ${item.id}`, steps, total);
                            }
                            return this.extractExtension(extension);
                        })
                        .then(() =>
                        {
                            result.updated.push(item);
                            done();
                        })
                        .catch(() =>
                        {
                            result.updatedErrors.push(item);
                            done();
                        });
                },
                () =>
                {
                    resolve(result);
                }
            );
        });
    }

    /**
     * Removes extensions.
     */
    private _removeExtensions(options: ISyncOptions): Promise<{ removed: IExtension[], removedErrors: IExtension[] }>
    {
        return new Promise((resolve) =>
        {
            const { extensions, progress, showIndicator = false, total } = options;

            let steps: number = progress;
            const result = { removed: [] as IExtension[], removedErrors: [] as IExtension[] };
            async.eachSeries(
                extensions,
                (item, done) =>
                {
                    steps++;

                    if (showIndicator)
                    {
                        Toast.showSpinner(`Syncing: Uninstalling extension: ${item.id}`, steps, total);
                    }

                    this.uninstallExtension(item).then(() =>
                    {
                        result.removed.push(item);
                        done();
                    }).catch(() =>
                    {
                        result.removedErrors.push(item);
                        done();
                    });
                },
                () =>
                {
                    resolve(result);
                }
            );
        });
    }
}
