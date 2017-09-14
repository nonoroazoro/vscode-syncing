/**
 * vscode extension utils.
 */

const fs = require("fs");
const fse = require("fs-extra");
const temp = require("temp").track();
const path = require("path");
const async = require("async");
const AdmZip = require("adm-zip");
const https = require("https");
const vscode = require("vscode");
const HttpsProxyAgent = require("https-proxy-agent");

const Toast = require("./Toast");
const Environment = require("./Environment");

class Extension
{
    constructor(p_context)
    {
        this._env = Environment.create(p_context);
    }

    /**
     * get all installed extensions.
     * @param {Boolean} [p_includeBuiltin=false] default is false, builtin extensions are not included.
     * @returns {Array} or `[]`.
     */
    getAll(p_includeBuiltin = false)
    {
        let item;
        const result = [];
        for (const ext of vscode.extensions.all)
        {
            if (p_includeBuiltin || !ext.packageJSON.isBuiltin)
            {
                item = {
                    name: ext.packageJSON.name,
                    publisher: ext.packageJSON.publisher,
                    version: ext.packageJSON.version,
                    id: `${ext.packageJSON.publisher}.${ext.packageJSON.name}`
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
                        Toast.showSpinner(`Syncing: Downloading extension: ${item.name}`, steps, total);
                    }

                    this.downloadExtension(item)
                        .then((extension) =>
                        {
                            if (showIndicator)
                            {
                                Toast.showSpinner(`Syncing: Installing extension: ${item.name}`, steps, total);
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
                    if (showIndicator)
                    {
                        Toast.clearSpinner("");
                    }
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
                        Toast.showSpinner(`Syncing: Downloading extension: ${item.name}`, steps, total);
                    }

                    this.downloadExtension(item)
                        .then((extension) =>
                        {
                            if (showIndicator)
                            {
                                Toast.showSpinner(`Syncing: Removing outdated extension: ${item.name}`, steps, total);
                            }
                            return this.uninstallExtension(extension);
                        })
                        .then((extension) =>
                        {
                            if (showIndicator)
                            {
                                Toast.showSpinner(`Syncing: Installing extension: ${item.name}`, steps, total);
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
                    if (showIndicator)
                    {
                        Toast.clearSpinner("");
                    }
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
                        Toast.showSpinner(`Syncing: Uninstalling extension: ${item.name}`, steps, total);
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
                    if (showIndicator)
                    {
                        Toast.clearSpinner("");
                    }
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
            try
            {
                temp.mkdir("syncing-", (err, res) =>
                {
                    if (err)
                    {
                        throw err;
                    }
                    else
                    {
                        const zip = new AdmZip(p_extension.zip);
                        zip.extractAllTo(res, true);
                        const extPath = path.join(this._env.extensionsPath, `${p_extension.publisher}.${p_extension.name}-${p_extension.version}`);
                        fse.copySync(
                            path.join(res, "extension"),
                            extPath
                        );

                        // clear temp file (async).
                        fse.remove(p_extension.zip);

                        p_resolve(Object.assign({}, p_extension, { path: extPath }));
                    }
                });
            }
            catch (err)
            {
                p_reject(`Cannot extract extension: ${p_extension.name}.`);
            }
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

let _instance;
/**
 * create single instance.
 * @param {Object} p_context
 * @returns {Extension}
 */
function create(p_context)
{
    if (_instance === undefined)
    {
        _instance = new Extension(p_context);
    }
    return _instance;
}

module.exports = {
    create
};
