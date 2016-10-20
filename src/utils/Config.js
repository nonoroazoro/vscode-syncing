/**
 * Syncing's config.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const extension = require("./Extension");

class Config
{
    constructor(p_context)
    {
        this.context = p_context;
        this._isMac = process.platform === "darwin";
        this._isInsiders = p_context.extensionPath.includes("insiders");
        this._extensionsPath = path.join(
            os.homedir(),
            this._isInsiders ? ".vscode-insiders" : ".vscode",
            "extensions"
        );
        this._codeBasePath = this._getCodeBasePath(this._isInsiders);
        this._codeUserPath = path.join(this._codeBasePath, "User");
    }

    /**
     * check if mac.
    */
    get isMac()
    {
        return this._isMac;
    }

    /**
     * check if vscode is an insiders version.
     */
    get isInsiders()
    {
        return this._isInsiders;
    }

    /**
     * get vscode's extensions base path.
     */
    get extensionsPath()
    {
        return this._extensionsPath;
    }

    /**
     * get vscode's config base path.
     */
    get codeBasePath()
    {
        return this._codeBasePath;
    }

    _getCodeBasePath(p_isInsiders)
    {
        let basePath;
        switch (process.platform)
        {
            case "win32":
                basePath = process.env.APPDATA;
                break;

            case "darwin":
                basePath = path.join(process.env.HOME, "Library/Application Support");
                break;

            case "linux":
                basePath = path.join(os.homedir(), ".config");
                break;

            default:
                basePath = "/var/local";
        }
        return path.join(basePath, p_isInsiders ? "Code - Insiders" : "Code");
    }

    /**
     * get vscode's config `User` path.
     */
    get codeUserPath()
    {
        return this._codeUserPath;
    }

    /**
     * get vscode configs list (will be uploaded or downloaded, anyway).
     * @param  {Object} [{ full = false, load = false }={}] full: default is false, the result is corresponding to current OS.
     * load: default is false, do not load file contens.
     * @returns {Promise}
     * for example:
     *    [
     *        {
     *            name: "extensions",
     *            path: "C:\\Users\\AppData\\Roaming\\Code\\User\\extensions.json",
     *            remote: "extensions.json",
     *            content: "// init"
     *        },
     *        ...
     *    ]
     */
    getConfigs({ full = false, load = false } = {})
    {
        return new Promise((p_resolve, p_reject) =>
        {
            const list = [
                { name: "extensions" },
                { name: "locale" },
                { name: "settings" }
                // { name: "snippets" }
            ];

            if (full)
            {
                list.push(
                    { name: "keybindings-mac" },
                    { name: "keybindings" }
                );
            }
            else
            {
                list.push(
                    this._isMac ?
                        { name: "keybindings-mac" }
                        : { name: "keybindings" }
                );
            }

            let result;
            const results = [];
            for (const item of list)
            {
                result = Object.assign({}, item, {
                    "path": path.join(
                        this.codeUserPath,
                        item.name.includes("keybindings") ? "keybindings.json" : `${item.name}.json`
                    ),
                    "remote": `${item.name}.json`
                });

                if (load)
                {
                    try
                    {
                        // result.content could be null.
                        result.content = this._loadItemContent(result);
                    }
                    catch (e)
                    {
                        // TODO: log file.
                        console.log(`Cannot read Syncing's config file: ${result.remote}, will be ignore.`);
                    }
                }
                results.push(result);
            }
            p_resolve(results);
        });
    }

    /**
     * save vscode configs to files.
     * @param  {Array} vscode configs from Gist.
     * @returns {Promise}
     */
    saveConfigs(p_files)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            if (p_files)
            {
                this.getConfigs().then((configs) =>
                {
                    let err;
                    let file;
                    const savedFiles = [];
                    for (const item of configs)
                    {
                        file = p_files[item.remote];
                        if (file)
                        {
                            try
                            {
                                savedFiles.push(this._saveItemContent(Object.assign({}, item, { content: file.content })));
                            }
                            catch (e)
                            {
                                err = new Error(`Cannot save settings file: ${item.remote} : ${e.message}`);
                                break;
                            }
                        }
                    }

                    if (err)
                    {
                        p_reject(err);
                    }
                    else
                    {
                        p_resolve(savedFiles);
                    }
                });
            }
            else
            {
                p_resolve();
            }
        });
    }

    /**
     * load item content.
     * @param {Object} p_item item of uploads.
     * @returns {string}
     */
    _loadItemContent(p_item)
    {
        if (p_item.name === "extensions")
        {
            return JSON.stringify(extension.getAll());
        }
        else
        {
            return fs.readFileSync(p_item.path, "utf8");
        }
    }

    /**
     * save item content to file or install extensions.
     * @param {Object} p_item item of configs.
     * @returns {Object}
     */
    _saveItemContent(p_item)
    {
        const saved = p_item;
        if (p_item.name === "extensions")
        {
            // TODO: install extensions.

            // return installed extensions list.
        }
        else
        {
            fs.writeFileSync(p_item.path, p_item.content || "{}");
        }
        return saved;
    }

    /**
     * load Syncing's settings (load from settings file: `syncing.json`).
     * @returns {Promise}
     */
    loadSyncingSettings()
    {
        return new Promise((p_resolve, p_reject) =>
        {
            let result = {};
            if (this.codeUserPath)
            {
                const filename = "syncing.json";
                const filepath = path.join(this.codeUserPath, filename);
                try
                {
                    if (fs.existsSync(filepath))
                    {
                        result = JSON.parse(fs.readFileSync(filepath, "utf8"));
                    }
                }
                catch (e)
                {
                    return p_reject(Error(`Cannot read Syncing's Settings file: ${filename}.`));
                }
            }
            return p_resolve(result);
        });
    }
}

module.exports = Config;
