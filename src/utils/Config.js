/**
 * Syncing's config.
 */

const fs = require("fs");
const path = require("path");
const async = require("async");

const Toast = require("./Toast");
const Extension = require("./Extension");
const Environment = require("./Environment");

// the default Syncing's settings.
const defaultSyncingSettings = {
    "token": "",
    "id": ""
};

class Config
{
    constructor(p_context)
    {
        this._env = Environment.create(p_context);
        this._extension = Extension.create(p_context);
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
                    this._env.isMac ?
                        { name: "keybindings-mac" }
                        : { name: "keybindings" }
                );
            }

            let result;
            const that = this;
            const results = [];
            const errors = [];
            async.eachSeries(
                list,
                (item, done) =>
                {
                    result = Object.assign({}, item, {
                        "path": path.join(
                            this._env.codeUserPath,
                            item.name.includes("keybindings") ? "keybindings.json" : `${item.name}.json`
                        ),
                        "remote": `${item.name}.json`
                    });

                    if (load)
                    {
                        that._loadItemContent(result).then((value) =>
                        {
                            result.content = value;
                            results.push(result);
                            done();
                        }).catch((err) =>
                        {
                            errors.push(result.remote);
                            results.push(result);
                            done();
                        });
                    }
                    else
                    {
                        results.push(result);
                        done();
                    }
                },
                () =>
                {
                    if (errors.length > 0)
                    {
                        console.log(`Cannot read Syncing's config file: ${errors.join("\n")}, will be ignore.`);
                    }
                    p_resolve(results);
                }
            );
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
                    let file;
                    const that = this;
                    const savedFiles = [];
                    async.eachSeries(
                        configs,
                        (item, done) =>
                        {
                            file = p_files[item.remote];
                            that._saveItemContent(Object.assign({}, item, { content: file.content })).then((saved) =>
                            {
                                savedFiles.push(saved);
                                done();
                            }).catch((err) =>
                            {
                                done(new Error(`Cannot save settings file: ${item.remote} : ${err.message}`));
                            });
                        },
                        (err) =>
                        {
                            if (err)
                            {
                                p_reject(err);
                            }
                            else
                            {
                                p_resolve(savedFiles);
                            }
                        }
                    );
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
     * @returns {Promise}
     */
    _loadItemContent(p_item)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            if (p_item.name === "extensions")
            {
                try
                {
                    p_resolve(JSON.stringify(this._extension.getAll()));
                }
                catch (err)
                {
                    p_reject(err);
                }
            }
            else
            {
                fs.readFile(p_item.path, "utf8", (err, res) =>
                {
                    if (err)
                    {
                        p_reject(err);
                    }
                    else
                    {
                        p_resolve(res);
                    }
                });
            }
        });
    }

    /**
     * save item content to file or install extensions.
     * @param {Object} p_item item of configs.
     * @returns {Promise}
     */
    _saveItemContent(p_item)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            if (p_item.name === "extensions")
            {
                try
                {
                    this._extension.sync(JSON.parse(p_item.content)).then((saved) =>
                    {
                        p_resolve(saved);
                    }).catch((err) =>
                    {
                        p_reject(err);
                    });
                }
                catch (err)
                {
                    p_reject(err);
                }
            }
            else
            {
                fs.writeFile(p_item.path, p_item.content || "{}", (err) =>
                {
                    if (err)
                    {
                        p_reject(err);
                    }
                    else
                    {
                        p_resolve({ file: p_item });
                    }
                });
            }
        });
    }

    /**
     * init Syncing settings file.
     * @returns {Promise}
     */
    initSyncingSettings()
    {
        return this.saveSyncingSettings(defaultSyncingSettings, false);
    }

    /**
     * clear GitHub token and save to file.
     * @returns {Promise}
     */
    clearSyncingToken()
    {
        const settings = this.loadSyncingSettings();
        settings.token = "";
        return this.saveSyncingSettings(settings, false);
    }

    /**
     * prepare Syncing's settings, will ask for settings if not exist.
     * @param {boolean} [p_checkGistID=true] default is true, check if Gist id is empty.
     * @returns {Promise}
     */
    prepareSyncingSettings(p_checkGistID = true)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            const tasks = [];
            const settings = this.loadSyncingSettings();
            if (!settings.token)
            {
                tasks.push(Toast.showGitHubTokenInputBox);
            }
            if (!settings.id && p_checkGistID)
            {
                tasks.push(Toast.showGistInputBox);
            }

            if (tasks.length === 0)
            {
                p_resolve(settings);
            }
            else
            {
                async.eachSeries(
                    tasks,
                    (task, done) =>
                    {
                        task().then((value) =>
                        {
                            Object.assign(settings, value);
                            done();
                        }).catch((err) =>
                        {
                            done(err);
                        });
                    },
                    (err) =>
                    {
                        if (err || !settings.token || (p_checkGistID && !settings.id))
                        {
                            p_reject();
                        }
                        else
                        {
                            this.saveSyncingSettings(settings).then(() =>
                            {
                                p_resolve(settings);
                            });
                        }
                    }
                );
            }
        });
    }

    /**
     * load Syncing's settings (load from settings file: `syncing.json`).
     * @returns {Object} or `{}`.
     */
    loadSyncingSettings()
    {
        const settings = Object.assign({}, defaultSyncingSettings);
        try
        {
            Object.assign(
                settings,
                JSON.parse(fs.readFileSync(this._env.syncingSettingPath, "utf8"))
            );
        }
        catch (err)
        {
        }
        return settings;
    }

    /**
     * save Syncing's settings (to settings file: `syncing.json`).
     * @param {Object} p_json settings.
     * @param {boolean} [p_toast=true] default is true, toast error.
     * @returns {Promise}
     */
    saveSyncingSettings(p_json, p_toast = true)
    {
        return new Promise((p_resolve) =>
        {
            try
            {
                fs.writeFile(this._env.syncingSettingPath, JSON.stringify(p_json) || "{}", (err) =>
                {
                    if (err && p_toast)
                    {
                        Toast.statusError(`Syncing: Cannot save Syncing settings: ${err}`);
                    }
                    p_resolve();
                });
            }
            catch (err)
            {
                if (err && p_toast)
                {
                    Toast.statusError(`Syncing: Cannot save Syncing settings: ${err}`);
                }
                p_resolve();
            }
        });
    }
}

let _instance;
/**
 * only create one instance.
 * @param {Object} p_context
 * @returns {Config}
 */
function create(p_context)
{
    if (_instance === undefined)
    {
        _instance = new Config(p_context);
    }
    return _instance;
}

module.exports = {
    create
};
