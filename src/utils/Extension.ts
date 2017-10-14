/**
 * vscode extension utils.
 */

import * as AdmZip from "adm-zip";
import * as async from "async";
import * as fs from "fs";
import * as fse from "fs-extra";
import * as https from "https";
import * as HttpsProxyAgent from "https-proxy-agent";
import * as path from "path";
import * as temp from "temp";
import * as vscode from "vscode";

import Environment from "./Environment";
import Toast from "./Toast";

temp.track();

export default class Extension
{
    private static _instance: Extension;

    private _env: Environment;

    constructor(context: vscode.ExtensionContext)
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
     * Get all installed extensions.
     * @param includeBuiltin Default is `false`, excludes builtin extensions.
     */
    public getAll(includeBuiltin = false): any[]
    {
        let item: {
            id?: string,
            name?: string,
            publisher?: string,
            version?: string,
            __metadata?: string
        };
        const result = [];
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
     * sync extensions (add/update/remove).
     * @param {Array} p_extensions extensions list.
     * @param {Boolean} [p_showIndicator=false] default is false, don't show progress indicator.
     */
    sync(p_extensions, p_showIndicator = false)
    {
        return new Promise((p_resolve) =>
        {
            this._getDifferentExtensions(p_extensions).then((diff) =>
            {
                // add/update/remove extensions.
                const { added, updated, removed, total } = diff;
                const result = { extension: {} };
                const tasks = [
                    this._addExtensions.bind(this, {
                        extensions: added,
                        progress: 0,
                        total,
                        showIndicator: p_showIndicator
                    }),
                    this._updateExtensions.bind(this, {
                        extensions: updated,
                        progress: added.length,
                        total,
                        showIndicator: p_showIndicator
                    }),
                    this._removeExtensions.bind(this, {
                        extensions: removed,
                        progress: added.length + updated.length,
                        total,
                        showIndicator: p_showIndicator
                    })
                ];
                async.eachSeries(
                    tasks,
                    (task, done) =>
                    {
                        task().then((value) =>
                        {
                            Object.assign(result.extension, value);
                            done();
                        });
                    },
                    () =>
                    {
                        if (p_showIndicator)
                        {
                            Toast.clearSpinner("");
                        }
                        p_resolve(result);
                    }
                );
            });
        });
    }

    /**
     * add extensions.
     * @param {Object} [{ extensions, progress, total, showIndicator = false }={}]
     *     extensions: extensions to add.
     *     progress: progress of the synchronization of all extensions.
     *     total: total progress of the synchronization of all extensions.
     *     [showIndicator=false]: default is false, don't show progress indicator.
     * @returns {Promise}
     */
    _addExtensions({ extensions, progress, total, showIndicator = false } = {})
    {
        return new Promise((p_resolve) =>
        {
            let steps = progress;
            const result = { added: [], addedErrors: [] };
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
                    p_resolve(result);
                }
            );
        });
    }

    /**
     * update extensions.
     * @param {Object} [{ extensions, progress, total, showIndicator = false }={}]
     *     extensions: extensions to update.
     *     progress: progress of the synchronization of all extensions.
     *     total: total progress of the synchronization of all extensions.
     *     [showIndicator=false]: default is false, don't show progress indicator.
     * @returns {Promise}
     */
    _updateExtensions({ extensions, progress, total, showIndicator = false } = {})
    {
        return new Promise((p_resolve) =>
        {
            let steps = progress;
            const result = { updated: [], updatedErrors: [] };
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
                    p_resolve(result);
                }
            );
        });
    }

    /**
     * remove extensions.
     * @param {Object} [{ extensions, progress, total, showIndicator = false }={}]
     *     extensions: extensions to remove.
     *     progress: progress of the synchronization of all extensions.
     *     total: total progress of the synchronization of all extensions.
     *     [showIndicator=false]: default is false, don't show progress indicator.
     * @returns {Promise}
     */
    _removeExtensions({ extensions, progress, total, showIndicator = false } = {})
    {
        return new Promise((p_resolve) =>
        {
            let steps = progress;
            const result = { removed: [], removedErrors: [] };
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
                    p_resolve(result);
                }
            );
        });
    }

    /**
     * download extension from vscode Marketplace.
     * @param {Object} p_extension
     * @returns {Promise}
     */
    downloadExtension(p_extension)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            const filepath = temp.path({ suffix: `.${p_extension.id}.zip` });
            const file = fs.createWriteStream(filepath);
            file.on("finish", () =>
            {
                p_resolve(Object.assign({}, p_extension, { zip: filepath }));
            }).on("error", p_reject);

            const options = {
                host: `${p_extension.publisher}.gallery.vsassets.io`,
                path: `/_apis/public/gallery/publisher/${p_extension.publisher}/extension/${p_extension.name}/${p_extension.version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`
            };
            const proxy = this._env.getSyncingProxy();
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
                    p_reject();
                }
            }).on("error", p_reject);
        });
    }

    /**
     * extract extension to vscode extensions folder.
     * @param {Object} p_extension
     * returns {Promise}
     */
    extractExtension(p_extension)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            temp.mkdir("syncing-", (err1, dirPath) =>
            {
                if (err1)
                {
                    p_reject(`Cannot extract extension: ${p_extension.id}. Access temp folder denied.`);
                }
                else
                {
                    const zip = new AdmZip(p_extension.zip);
                    zip.extractAllToAsync(dirPath, true, (err2) =>
                    {
                        if (err2)
                        {
                            p_reject(`Cannot extract extension: ${p_extension.id}. ${err2.message}`);
                        }
                        else
                        {
                            const extPath = path.join(this._env.extensionsPath, `${p_extension.publisher}.${p_extension.name}-${p_extension.version}`);
                            fse.emptyDir(extPath)
                                .then(() =>
                                {
                                    return fse.copy(path.join(dirPath, "extension"), extPath);
                                })
                                .then(() =>
                                {
                                    // clear temp file (asynchronization and don't wait).
                                    fse.remove(p_extension.zip).catch(() => { });
                                    p_resolve(Object.assign({}, p_extension, { path: extPath }));
                                })
                                .catch((err3) =>
                                {
                                    p_reject(`Cannot extract extension: ${p_extension.id}. ${err3.message}`);
                                });
                        }
                    });
                }
            });
        });
    }

    /**
     * update extension's __metadata.
     * @param {Object} p_extension
     * returns {Promise}
     */
    updateMetadata(p_extension)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            if (p_extension && p_extension.__metadata)
            {
                try
                {
                    const filepath = path.join(p_extension.path, "package.json");
                    const packageJSON = JSON.parse(fs.readFileSync(filepath, "utf8"));
                    packageJSON.__metadata = p_extension.__metadata;
                    fs.writeFileSync(filepath, JSON.stringify(packageJSON), "utf8");
                    p_resolve(p_extension);
                }
                catch (err)
                {
                    p_reject(`Cannot update extension's metadata: ${p_extension.id}.`);
                }
            }
            else
            {
                p_resolve(p_extension);
            }
        });
    }

    /**
     * uninstall vscode extension.
     * @param {Object} p_extension
     * returns {Promise}
     */
    uninstallExtension(p_extension)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            const localExtension = vscode.extensions.getExtension(p_extension.id);
            const version = localExtension ? localExtension.packageJSON.version : p_extension.version;
            fse.remove(path.join(this._env.extensionsPath, `${p_extension.publisher}.${p_extension.name}-${version}`), (err) =>
            {
                if (err)
                {
                    p_reject(new Error(`Cannot uninstall extension: ${p_extension.id}`));
                }
                else
                {
                    p_resolve(p_extension);
                }
            });
        });
    }

    /**
     * get extensions that are added/updated/removed.
     * @param {Array} p_extensions
     * @returns {Promise}
     */
    _getDifferentExtensions(p_extensions)
    {
        return new Promise((p_resolve) =>
        {
            const extensions = { added: [], updated: [], removed: [], total: 0 };
            if (p_extensions)
            {
                let localExtension;
                const reservedExtensionIDs = [];

                // find added & updated extensions.
                for (const ext of p_extensions)
                {
                    localExtension = vscode.extensions.getExtension(ext.id);
                    if (localExtension)
                    {
                        if (localExtension.packageJSON.version === ext.version)
                        {
                            // reserved.
                            reservedExtensionIDs.push(ext.id);
                        }
                        else
                        {
                            // updated.
                            extensions.updated.push(ext);
                            extensions.total = extensions.total + 1;
                        }
                    }
                    else
                    {
                        // added.
                        extensions.added.push(ext);
                        extensions.total = extensions.total + 1;
                    }
                }

                const localExtensions = this.getAll();
                for (const ext of localExtensions)
                {
                    if (!reservedExtensionIDs.includes(ext.id))
                    {
                        // removed.
                        extensions.removed.push(ext);
                        extensions.total = extensions.total + 1;
                    }
                }
            }
            p_resolve(extensions);
        });
    }
}
