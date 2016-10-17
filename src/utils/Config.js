const os = require("os");
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
}

module.exports = Config;
