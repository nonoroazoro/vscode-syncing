/**
 * vscode extension utils.
 */

const fs = require("fs");
const path = require("path");
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
     * install extensions.
     * @param {Array} p_extensions extensions list.
     */
    install(p_extensions)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            this._getDifferentExtensions(p_extensions).then((diff) =>
            {
                this.downloadExtension(p_extensions[0]).then(console.log);

                if (diff.added.length > 0)
                {
                    // TODO: add extensions
                }

                if (diff.changed.length > 0)
                {
                    // TODO: changed extensions (maybe updated)
                }

                if (diff.removed.length > 0)
                {
                    // TODO: remove extensions
                }

                p_resolve();
            });
        });
    }

    /**
     * download extension from vscode Marketplace.
     * @param {Promise}
     */
    downloadExtension(p_extension)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            const options = {
                host: `${p_extension.publisher}.gallery.vsassets.io`,
                path: `/_apis/public/gallery/publisher/${p_extension.publisher}/extension/${p_extension.name}/${p_extension.version}/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`,
                agent: new HttpsProxyAgent("http://127.0.0.1:1080")
            };

            const filepath = path.join("C:\\Downloads\\vscode", `${p_extension.name}.zip`);
            const file = fs.createWriteStream(filepath);
            file.on("finish", () =>
            {
                p_resolve(filepath);
            }).on("error", (err) =>
            {
                fs.unlink(filepath);
                p_reject(err);
            });

            https.get(options, (res) =>
            {
                if (res.statusCode === 200)
                {
                    res.pipe(file);
                }
                else
                {
                    fs.unlink(filepath);
                    p_reject();
                }
            }).on("error", (err) =>
            {
                fs.unlink(filepath);
                p_reject(err);
            });
        });
    }

    /**
     * get extensions that are added/changed/removed.
     * @param {Array} p_extensions
     * @returns {Promise}
     */
    _getDifferentExtensions(p_extensions)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            const extensions = { added: [], changed: [], removed: [] };
            if (p_extensions)
            {
                let localExtension;
                const reservedExtensionIDs = [];

                // find added & changed extensions.
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
                            // changed.
                            extensions.changed.push(ext);
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
