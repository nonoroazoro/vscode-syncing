const os = require("os");
const fs = require("fs");
const path = require("path");

/**
 * Configs of current vscode.
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
        this._codeBasePath = this._getCodeBasePath();
        this._codeUserPath = path.join(this._codeBasePath, "User");
        this._uploads = this._getUploads(this._codeUserPath);
        this._settings = this._loadSettings(this._codeUserPath);
    }

    /**
     * check if mac.
    */
    get isMac()
    {
        return this._isMac;
    }

    /**
     * check if vscode is a insiders version.
     */
    get isInsiders()
    {
        return this._isInsiders;
    }

    /**
     * get vscode extensions base path.
     */
    get extensionsPath()
    {
        return this._extensionsPath;
    }

    /**
     * get vscode config base path.
     */
    get codeBasePath()
    {
        return this._codeBasePath;
    }

    /**
     * get vscode config base path.
     */
    _getCodeBasePath()
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
        return path.join(basePath, this.isInsiders ? "Code - Insiders" : "Code");
    }

    /**
     * get vscode config user path.
     */
    get codeUserPath()
    {
        return this._codeUserPath;
    }

    /**
     * get configs list (to upload).
     * example:
     *  {
     *      name:"extensions"
     *      path:"C:\\Users\\AppData\\Roaming\\Code\\User\\extensions.json"
     *      remote:"extensions.json"
     *      type:"file"
     *  }
     */
    get uploads()
    {
        return this._uploads;
    }

    /**
     * get configs list (to upload).
     */
    _getUploads(p_codeUserPath)
    {
        return [
            { type: "file", name: "extensions" },
            { type: "file", name: "keybindings" },
            { type: "file", name: "locale" },
            { type: "file", name: "settings" },
            { type: "folder", name: "snippets" }
        ].map((item) =>
        {
            if (item.type === "file")
            {
                return Object.assign({}, item, {
                    "path": path.join(p_codeUserPath, `${item.name}.json`),
                    "remote": `${item.name}.json`
                });
            }
            else
            {
                return Object.assign({}, item, {
                    "path": path.join(p_codeUserPath, item.name, path.sep),
                    "remote": item.name
                });
            }
        });
    }

    /**
     * get extension's settings.
     */
    get settings()
    {
        return this._settings;
    }

    /**
     * load extension settings from local file.
     * @param {String} p_codeUserPath vscode config user path.
     * @returns {Object} settings.
     */
    _loadSettings(p_codeUserPath)
    {
        let settings = {};
        const filename = "syncing.json";
        const filepath = path.join(p_codeUserPath, filename);
        try
        {
            if (fs.existsSync(filepath))
            {
                settings = JSON.parse(fs.readFileSync(filepath, "utf8"));
            }
        }
        catch (e)
        {
            throw new Error(`Cannot read Syncing's Config file: ${filename}.`);
        }
        return settings;
    }
}

module.exports = Config;
