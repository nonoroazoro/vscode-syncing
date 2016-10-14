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
        this._uploads = this._getUploads(this._codeUserPath, this._isMac);
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
    _getUploads(p_codeUserPath, p_isMac)
    {
        const list = {};

        // 1. files
        [
            "extensions",
            "keybindings",
            "locale",
            "settings"
        ].forEach((value) =>
        {
            list[value] = {
                "local": path.join(p_codeUserPath, `${value}.json`),
                "remote": `${value}.json`
            };

            if (value === "keybindings" && p_isMac)
            {
                list[value].remote = `${value}-mac.json`;
            }
        });

        // 2. folders
        ["snippets"].forEach((value) =>
        {
            list[value] = {
                "local": path.join(p_codeUserPath, `${value}`, path.sep),
                "remote": `${value}`
            };
        });

        return list;
    }
}

module.exports = Config;
