const fs = require("fs");
const os = require("os");
const path = require("path");
const extension = require("./Extension");

/**
 * Syncing's config.
 */
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
     * get uploads.
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
    getUploads({ full = false, load = false } = {})
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

            try
            {
                p_resolve(
                    list.map((item) =>
                    {
                        const result = Object.assign({}, item, {
                            "path": path.join(
                                this.codeUserPath,
                                item.name.includes("keybindings") ? "keybindings.json" : `${item.name}.json`
                            ),
                            "remote": `${item.name}.json`
                        });

                        if (load)
                        {
                            result.content = this._loadItemContent(result);
                        }

                        return result;
                    })
                );
            }
            catch (e)
            {
                p_reject(e);
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
            try
            {
                return fs.readFileSync(p_item.path, "utf8");
            }
            catch (e)
            {
                throw new Error(`Cannot read Syncing's Config file: ${p_item.remote}.`);
            }
        }
    }

    /**
     * load Syncing's settings.
     * @returns {Promise}
     */
    loadSettings()
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
                    result = new Error(`Cannot read Syncing's Settings file: ${filename}.`);
                }
            }
            p_resolve(result);
        });
    }
}

module.exports = Config;
