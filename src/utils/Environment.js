/**
 * vscode's environment.
 */

const os = require("os");
const path = require("path");
const vscode = require("vscode");

class Environment
{
    constructor(p_context)
    {
        this._isMac = process.platform === "darwin";
        this._isInsiders = p_context.extensionPath.includes("insider");
        this._extensionsPath = path.join(
            os.homedir(),
            this._isInsiders ? ".vscode-insiders" : ".vscode",
            "extensions"
        );
        this._codeBasePath = this._getCodeBasePath(this._isInsiders);
        this._codeUserPath = path.join(this._codeBasePath, "User");
        this._snippetsPath = path.join(this._codeUserPath, "snippets");
        this._syncingSettingsPath = path.join(this._codeUserPath, "syncing.json");
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
     * get vscode's config `snippets` path.
     */
    get snippetsPath()
    {
        return this._snippetsPath;
    }

    /**
     * get Syncing's config file path.
     */
    get syncingSettingPath()
    {
        return this._syncingSettingsPath;
    }

    /**
     * get local snippet filepath from filename.
     * @param {String} p_filename snippet filename.
     * @returns {String}
     */
    getSnippetFilePath(p_filename)
    {
        return path.join(this.snippetsPath, p_filename);
    }

    /**
     * get proxy settings of Syncing, using vscode's `http.proxy`.
     * @returns {String} or `undefined`.
     */
    getSyncingProxy()
    {
        let proxy = vscode.workspace.getConfiguration("http")["proxy"];
        if (typeof proxy === "string")
        {
            proxy = proxy.trim();
            if (proxy !== "")
            {
                return proxy;
            }
        }
        return undefined;
    }
}

let _instance;
/**
 * only create one instance.
 * @param {Object} p_context
 * @returns {Environment}
 */
function create(p_context)
{
    if (_instance === undefined)
    {
        _instance = new Environment(p_context);
    }
    return _instance;
}

module.exports = {
    create
};
