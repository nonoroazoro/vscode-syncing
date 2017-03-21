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
     */
    sync(p_extensions)
    {
        return new Promise((p_resolve) =>
        {
            this._getDifferentExtensions(p_extensions).then((diff) =>
            {
                // add/update/remove extensions.
                const result = { extension: {} };
                const tasks = [
                    this._addExtensions.bind(this, diff.added),
                    this._updateExtensions.bind(this, diff.updated),
                    this._removeExtensions.bind(this, diff.removed)
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
                        p_resolve(result);
                    }
                );
            });
        });
    }

    /**
     * add extensions.
     * @param {Array} p_extensions
     * @returns {Promise}
     */
    _addExtensions(p_extensions)
    {
        return new Promise((p_resolve) =>
        {
            Toast.status("Syncing: installing new extensions...");

            const result = { added: [], addedErrors: [] };
            async.eachSeries(
                p_extensions,
                (item, done) =>
                {
                    this.downloadExtension(item)
                        .then((extension) =>
                        {
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
     * @param {Array} p_extensions
     * @returns {Promise}
     */
    _updateExtensions(p_extensions)
    {
        return new Promise((p_resolve) =>
        {
            Toast.status("Syncing: updating extensions...");

            const result = { updated: [], updatedErrors: [] };
            async.eachSeries(
                p_extensions,
                (item, done) =>
                {
                    this.downloadExtension(item)
                        .then((extension) =>
                        {
                            return this.uninstallExtension(extension, false);
                        })
                        .then((extension) =>
                        {
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
     * @param {Array} p_extensions
     * @returns {Promise}
     */
    _removeExtensions(p_extensions)
    {
        return new Promise((p_resolve) =>
        {
            Toast.status("Syncing: removing unused extensions...");

            const result = { removed: [], removedErrors: [] };
            async.eachSeries(
                p_extensions,
                (item, done) =>
                {
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
            Toast.status(`Syncing: downloading extension: ${p_extension.id}`);

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
            Toast.status(`Syncing: installing extension: ${p_extension.id}`);

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
                p_reject(`Cannot extract extension: ${p_extension.id}.`);
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
     * @param {Boolean} [p_showToast=true] default is true, show toast.
     * returns {Promise}
     */
    uninstallExtension(p_extension, p_showToast = true)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            if (p_showToast)
            {
                Toast.status(`Syncing: removing extension: ${p_extension.id}`);
            }

            fse.remove(path.join(this._env.extensionsPath, `${p_extension.publisher}.${p_extension.name}-${p_extension.version}`), (err) =>
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
            const extensions = { added: [], updated: [], removed: [] };
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
                        }
                    }
                    else
                    {
                        // added.
                        extensions.added.push(ext);
                    }
                }

                const localExtensions = this.getAll();
                for (const ext of localExtensions)
                {
                    if (!reservedExtensionIDs.includes(ext.id))
                    {
                        // removed.
                        extensions.removed.push(ext);
                    }
                }
            }
            p_resolve(extensions);
        });
    }
}

let _instance;
/**
 * only create one instance.
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
