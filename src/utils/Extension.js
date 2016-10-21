/**
 * vscode extension utils.
 */

const fs = require("fs");
const fse = require("fs-extra");
const temp = require("temp");
const path = require("path");
const async = require("async");
const AdmZip = require("adm-zip");
const https = require("https");
const vscode = require("vscode");
const HttpsProxyAgent = require("https-proxy-agent");

const Environment = require("./Environment");

class Extension
{
    constructor(p_context)
    {
        this._env = Environment.create(p_context);
    }

    /**
     * get all installed extensions.
     * @param {boolean} [p_includeBuiltin=false] default is false, builtin extensions are not included.
     * @returns {Array} or `[]`.
     */
    getAll(p_includeBuiltin = false)
    {
        const result = [];
        for (const ext of vscode.extensions.all)
        {
            if (p_includeBuiltin || !ext.packageJSON.isBuiltin)
            {
                result.push({
                    name: ext.packageJSON.name,
                    publisher: ext.packageJSON.publisher,
                    version: ext.packageJSON.version,
                    id: `${ext.packageJSON.publisher}.${ext.packageJSON.name}`
                });
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
            const that = this;
            const result = { added: [], addedErrors: [] };
            async.eachSeries(
                p_extensions,
                (item, done) =>
                {
                    that.downloadExtension(item)
                        .then(that.extractExtension.bind(that))
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
            const that = this;
            const result = { updated: [], updatedErrors: [] };
            async.eachSeries(
                p_extensions,
                (item, done) =>
                {
                    that.downloadExtension(item)
                        .then(that.uninstallExtension.bind(that))
                        .then(that.extractExtension.bind(that))
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
            const that = this;
            const result = { removed: [], removedErrors: [] };
            async.eachSeries(
                p_extensions,
                (item, done) =>
                {
                    that.uninstallExtension(item).then(() =>
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
                p_resolve(Object.assign({}, p_extension, { path: filepath }));
            }).on("error", (err) =>
            {
                temp.cleanup(() =>
                {
                    p_reject(err);
                });
            });

            const options = {
                host: `${p_extension.publisher}.gallery.vsassets.io`,
                path: `/_apis/public/gallery/publisher/${p_extension.publisher}/extension/${p_extension.name}/${p_extension.version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`,
                agent: new HttpsProxyAgent("http://127.0.0.1:1080")
            };
            https.get(options, (res) =>
            {
                if (res.statusCode === 200)
                {
                    res.pipe(file);
                }
                else
                {
                    temp.cleanup(() =>
                    {
                        p_reject();
                    });
                }
            }).on("error", (err) =>
            {
                temp.cleanup(() =>
                {
                    p_reject(err);
                });
            });
        });
    }

    /**
     * download extension from vscode Marketplace.
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
                        const zip = new AdmZip(p_extension.path);
                        zip.extractAllTo(res, true);
                        fse.copySync(
                            path.join(res, "extension"),
                            path.join(this._env.extensionsPath, `${p_extension.publisher}.${p_extension.name}-${p_extension.version}`)
                        );
                        p_resolve();
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
     * uninstall vscode extension.
     * @param {Object} p_extension
     * returns {Promise}
     */
    uninstallExtension(p_extension)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            fse.remove(path.join(this._env.extensionsPath, `${p_extension.publisher}.${p_extension.name}-${p_extension.version}`), (err) =>
            {
                if (err)
                {
                    p_reject(new Error(`Cannot uninstall extension: ${p_extension.id}`));
                }
                else
                {
                    p_resolve();
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
