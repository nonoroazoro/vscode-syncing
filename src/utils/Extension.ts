import * as AdmZip from "adm-zip";
import * as async from "async";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as https from "https";
import * as HttpsProxyAgent from "https-proxy-agent";
import * as path from "path";
import * as temp from "temp";
import * as vscode from "vscode";

import { IConfig } from "./Config";
import Environment from "./Environment";
import Toast from "./Toast";

temp.track();

/**
 * Represent a VSCode extension.
 */
export interface IExtension
{
    /**
     * The extension's identifier in the form of: `publisher.name`.
     */
    id: string;

    /**
     * The extension's name.
     */
    name: string;

    /**
     * The extension's publisher.
     */
    publisher: string;

    /**
     * The extension's version.
     */
    version: string;

    /**
     * The extension's metadata.
     */
    __metadata?: string;

    /**
     * The downloaded extension's zip file path.
     */
    zip?: string;

    /**
     * The installed extension's folder path.
     */
    path?: string;
}

/**
 * Represent the options of [_addExtensions](#Extension._addExtensions),
 * [_updateExtensions](#Extension._updateExtensions) and [_removeExtensions](#Extension._removeExtensions).
 */
export interface ISyncOptions
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
 * Represent the status of synchronization.
 */
export interface ISyncStatus
{
    /**
     * Extensions that have been added, updated or removed.
     */
    extension?: {
        added: IExtension[],
        addedErrors: IExtension[],
        updated: IExtension[],
        updatedErrors: IExtension[],
        removed: IExtension[],
        removedErrors: IExtension[]
    };

    /**
     * Files that have been added, updated or removed.
     */
    file?: IConfig;
}

/**
 * VSCode extension wrapper.
 */
export default class Extension
{
    private static _instance: Extension;

    private _env: Environment;

    private constructor(context: vscode.ExtensionContext)
    {
        this._env = Environment.create(context);
    }

    /**
     * Create an instance of singleton class `Extension`.
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
     * Get all installed extensions (Disabled extensions aren't included).
     * @param includeBuiltin Whether to include builtin extensions. Defaults to `false`.
     */
    public getAll(includeBuiltin = false): IExtension[]
    {
        let item: IExtension;
        const result: IExtension[] = [];
        for (const ext of vscode.extensions.all)
        {
            if (includeBuiltin || !ext.packageJSON.isBuiltin)
            {
                item = {
                    id: `${ext.packageJSON.publisher}.${ext.packageJSON.name}`,
                    name: ext.packageJSON.name,
                    publisher: ext.packageJSON.publisher,
                    version: ext.packageJSON.version
                };
                if (ext.packageJSON.__metadata)
                {
                    item.__metadata = ext.packageJSON.__metadata;
                }
                result.push(item);
            }
        }
        return result;
    }

    /**
     * Sync extensions (add/update/remove).
     * @param extensions Extensions list.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    sync(extensions: IExtension[], showIndicator: boolean = false): Promise<ISyncStatus>
    {
        return new Promise((resolve) =>
        {
            this._getDifferentExtensions(extensions).then((diff) =>
            {
                // Add/update/remove extensions.
                const { added, updated, removed, total } = diff;
                const result = { extension: {} } as ISyncStatus;
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
                            // TODO: 检查结果是否正确。
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
                        resolve(result);
                    }
                );
            });
        });
    }

    /**
     * Add extensions.
     */
    _addExtensions(options: ISyncOptions): Promise<{ added: IExtension[], addedErrors: IExtension[] }>
    {
        return new Promise((resolve) =>
        {
            const { extensions, progress, total, showIndicator = false } = options;

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
                        .then((extension) =>
                        {
                            return this.updateMetadata(extension);
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
     * Update extensions.
     */
    _updateExtensions(options: ISyncOptions): Promise<{ updated: IExtension[], updatedErrors: IExtension[] }>
    {
        return new Promise((resolve) =>
        {
            const { extensions, progress, total, showIndicator = false } = options;

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
                        .then((extension) =>
                        {
                            return this.updateMetadata(extension);
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
     * Remove extensions.
     */
    _removeExtensions(options: ISyncOptions): Promise<{ removed: IExtension[], removedErrors: IExtension[] }>
    {
        return new Promise((resolve) =>
        {
            const { extensions, progress, total, showIndicator = false } = options;

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

    /**
     * Download extension from VSCode marketplace.
     */
    downloadExtension(extension: IExtension): Promise<IExtension>
    {
        return new Promise((resolve, reject) =>
        {
            const filepath = temp.path({ suffix: `.${extension.id}.zip` });
            const file = fs.createWriteStream(filepath);
            file.on("finish", () =>
            {
                resolve(Object.assign({}, extension, { zip: filepath }));
            }).on("error", reject);

            const options: https.RequestOptions = {
                host: `${extension.publisher}.gallery.vsassets.io`,
                path: `/_apis/public/gallery/publisher/${extension.publisher}/extension/${extension.name}/${extension.version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`
            };
            const proxy = this._env.syncingProxy;
            if (proxy)
            {
                options.agent = new HttpsProxyAgent(proxy);
            }

            https.get(options, (res) =>
            {
                if (res.statusCode === 200)
                {
                    res.pipe(file);
                }
                else
                {
                    reject();
                }
            }).on("error", reject);
        });
    }

    /**
     * Extract extension zip file to VSCode extensions folder.
     */
    extractExtension(extension: IExtension): Promise<IExtension>
    {
        return new Promise((resolve, reject) =>
        {
            temp.mkdir("syncing-", (err1, dirPath) =>
            {
                if (err1)
                {
                    reject(`Cannot extract extension: ${extension.id}. Access temp folder denied.`);
                }
                else if (!extension.zip)
                {
                    reject(`Cannot extract extension: ${extension.id}. Zip file not found.`);
                }
                else
                {
                    const zip: AdmZip = new AdmZip(extension.zip);
                    zip.extractAllToAsync(dirPath, true, (err2) =>
                    {
                        if (err2)
                        {
                            reject(`Cannot extract extension: ${extension.id}. ${err2.message}`);
                        }
                        else
                        {
                            const extPath = path.join(this._env.extensionsPath, `${extension.publisher}.${extension.name}-${extension.version}`);
                            fse.emptyDir(extPath)
                                .then(() =>
                                {
                                    return fse.copy(path.join(dirPath, "extension"), extPath);
                                })
                                .then(() =>
                                {
                                    // Clear temp file (background and don't wait).
                                    fse.remove(extension.zip!).catch(() => { });
                                    resolve(Object.assign({}, extension, { path: extPath }));
                                })
                                .catch((err3) =>
                                {
                                    reject(`Cannot extract extension: ${extension.id}. ${err3.message}`);
                                });
                        }
                    });
                }
            });
        });
    }

    /**
     * Update extension's __metadata (post-process).
     */
    updateMetadata(extension: IExtension): Promise<IExtension>
    {
        return new Promise((resolve, reject) =>
        {
            if (extension && extension.__metadata && extension.path)
            {
                try
                {
                    const filepath = path.join(extension.path, "package.json");
                    const packageJSON = JSON.parse(fs.readFileSync(filepath, "utf8"));
                    packageJSON.__metadata = extension.__metadata;
                    fs.writeFileSync(filepath, JSON.stringify(packageJSON), "utf8");
                    resolve(extension);
                }
                catch (err)
                {
                    reject(`Cannot update extension's metadata: ${extension.id}.`);
                }
            }
            else
            {
                resolve(extension);
            }
        });
    }

    /**
     * Uninstall extension.
     */
    uninstallExtension(extension: IExtension): Promise<IExtension>
    {
        return new Promise((resolve, reject) =>
        {
            const localExtension = vscode.extensions.getExtension(extension.id);
            const version = localExtension ? localExtension.packageJSON.version : extension.version;
            fse.remove(path.join(this._env.extensionsPath, `${extension.publisher}.${extension.name}-${version}`), (err) =>
            {
                if (err)
                {
                    reject(new Error(`Cannot uninstall extension: ${extension.id}`));
                }
                else
                {
                    resolve(extension);
                }
            });
        });
    }

    /**
     * Get extensions that are added/updated/removed.
     */
    _getDifferentExtensions(extensions: IExtension[]): Promise<{
        added: IExtension[],
        removed: IExtension[],
        updated: IExtension[],
        total: number
    }>
    {
        return new Promise((resolve) =>
        {
            const result = {
                added: [] as IExtension[],
                removed: [] as IExtension[],
                updated: [] as IExtension[],
                get total()
                {
                    // TODO: 检查 total 是否正确。
                    return this.added.length + this.removed.length + this.updated.length;
                }
            };
            if (extensions)
            {
                let localExtension: vscode.Extension<any>;
                const reservedExtensionIDs: string[] = [];

                // Find added & updated extensions.
                for (const ext of extensions)
                {
                    localExtension = vscode.extensions.getExtension(ext.id);
                    if (localExtension)
                    {
                        if (localExtension.packageJSON.version === ext.version)
                        {
                            // Reserved.
                            reservedExtensionIDs.push(ext.id);
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

                const localExtensions: IExtension[] = this.getAll();
                for (const ext of localExtensions)
                {
                    if (reservedExtensionIDs.indexOf(ext.id) === -1)
                    {
                        // Removed.
                        result.removed.push(ext);
                    }
                }
            }
            resolve(result);
        });
    }
}
