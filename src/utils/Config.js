/**
 * Syncing's config.
 */

const fs = require("fs");
const path = require("path");
const async = require("async");

const Gist = require("./Gist");
const Toast = require("./Toast");
const Extension = require("./Extension");

import Environment from "./Environment";

// the default Syncing's settings.
const defaultSyncingSettings = {
    "token": "",
    "id": ""
};

// the remote snippet file prefix;
const snippetPrefix = "snippet-";

class Config
{
    constructor(p_context)
    {
        this._env = Environment.create(p_context);
        this._extension = Extension.create(p_context);
    }

    /**
     * get vscode configs list (will be uploaded or downloaded, anyway).
     * @param {Object} [{ full = false, load = false }={}]
     *     full: default is false, the result is corresponding to current OS.
     *     load: default is false, do not load file contents.
     *     showIndicator: default is false, don't show progress indicator.
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
    getConfigs({ full = false, load = false, showIndicator = false } = {})
    {
        return new Promise((p_resolve) =>
        {
            function resolveWrap(p_value)
            {
                if (showIndicator)
                {
                    Toast.clearSpinner("");
                }
                p_resolve(p_value);
            }

            if (showIndicator)
            {
                Toast.showSpinner("Syncing: Gathering local settings.");
            }

            // the item order is very important to ensure that the small files are synced first.
            // thus, the extensions will be the last one to sync.
            const list = [
                { name: "locale", type: "file" },
                { name: "snippets", type: "folder" },
                { name: "extensions", type: "file" }
            ];

            if (full)
            {
                list.unshift(
                    { name: "settings-mac", type: "file" },
                    { name: "settings", type: "file" },
                    { name: "keybindings-mac", type: "file" },
                    { name: "keybindings", type: "file" }
                );
            }
            else
            {
                list.unshift(
                    this._env.isMac ?
                        { name: "settings-mac", type: "file" }
                        : { name: "settings", type: "file" },
                    this._env.isMac ?
                        { name: "keybindings-mac", type: "file" }
                        : { name: "keybindings", type: "file" }
                );
            }

            let temp;
            let localFilename;
            const results = [];
            const errors = [];
            async.eachSeries(
                list,
                (item, done) =>
                {
                    if (item.type === "folder")
                    {
                        // attention: snippets may be empty.
                        temp = this._getSnippets(this._env.snippetsPath);
                    }
                    else
                    {
                        localFilename = `${item.name}.json`;
                        if (item.name.includes("settings"))
                        {
                            localFilename = "settings.json";
                        }
                        else if (item.name.includes("keybindings"))
                        {
                            localFilename = "keybindings.json";
                        }

                        temp = [
                            {
                                "name": item.name,
                                "path": path.join(
                                    this._env.codeUserPath,
                                    localFilename
                                ),
                                "remote": `${item.name}.json`
                            }
                        ];
                    }

                    if (load)
                    {
                        this._loadItemContent(temp).then((values) =>
                        {
                            values.forEach((value) =>
                            {
                                if (value.content)
                                {
                                    results.push(value);
                                }
                                else
                                {
                                    errors.push(value.remote);
                                }
                            });
                            done();
                        });
                    }
                    else
                    {
                        results.push(...temp);
                        done();
                    }
                },
                () =>
                {
                    if (errors.length > 0)
                    {
                        console.log(`Some of the VSCode's settings are invalid (will be ignored): ${errors.join(" ")}`);
                    }
                    resolveWrap(results);
                }
            );
        });
    }

    /**
     * get all snippet files.
     * @param {String} p_folderpath snippets path.
     * @returns {Array} or `[]`.
     */
    _getSnippets(p_folderpath)
    {
        const result = [];
        try
        {
            const filenames = fs.readdirSync(p_folderpath);
            filenames.forEach((filename) =>
            {
                // add prefix `snippet-` for all snippets.
                result.push({
                    name: filename,
                    path: path.join(p_folderpath, filename),
                    remote: `${snippetPrefix}${filename}`
                });
            });
        }
        catch (err)
        {
        }
        return result;
    }

    /**
     * save vscode configs to files.
     * @param {Object} vscode configs from Gist.
     * @param {Boolean} [p_showIndicator=false] default is false, don't show progress indicator.
     * @returns {Promise}
     */
    saveConfigs(p_files, p_showIndicator)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            function resolveWrap(p_value)
            {
                if (p_showIndicator)
                {
                    Toast.clearSpinner("");
                }
                p_resolve(p_value);
            }

            function rejectWrap(p_error)
            {
                if (p_showIndicator)
                {
                    Toast.statusError(`Syncing: Downloading failed. ${p_error.message}`);
                }
                p_reject(p_error);
            }

            if (p_showIndicator)
            {
                Toast.showSpinner("Syncing: Downloading settings.");
            }

            if (p_files)
            {
                let extensionsFile;
                const saveFiles = [];
                const removeFiles = [];
                const existsFileKeys = [];
                this.getConfigs().then((configs) =>
                {
                    let file;
                    for (const item of configs)
                    {
                        file = p_files[item.remote];
                        if (file)
                        {
                            // file exists in remote and local, sync it.
                            if (item.name === "extensions")
                            {
                                // temp extensions file.
                                extensionsFile = Object.assign({}, item, { content: file.content });
                            }
                            else
                            {
                                // temp other file.
                                saveFiles.push(Object.assign({}, item, { content: file.content }));
                            }
                            existsFileKeys.push(item.remote);
                        }
                        else
                        {
                            // file exists in remote, but not exists in local.
                            // and delete it if it's a snippet file.
                            if (item.remote.startsWith(snippetPrefix))
                            {
                                removeFiles.push(item);
                            }
                        }
                    }

                    let filename;
                    for (const key of Object.keys(p_files))
                    {
                        if (!existsFileKeys.includes(key))
                        {
                            file = p_files[key];
                            if (file.filename.startsWith(snippetPrefix))
                            {
                                filename = file.filename.slice(snippetPrefix.length);
                                if (filename)
                                {
                                    saveFiles.push({
                                        content: file.content,
                                        name: filename,
                                        path: this._env.getSnippetFilePath(filename),
                                        remote: file.filename
                                    });
                                }
                            }
                            else
                            {
                                // unknown files, do not process.
                            }
                        }
                    }

                    // put extensions file to the last.
                    if (extensionsFile)
                    {
                        saveFiles.push(extensionsFile);
                    }

                    const syncedFiles = { updated: [], removed: [] };
                    async.eachSeries(
                        saveFiles,
                        (item, done) =>
                        {
                            this._saveItemContent(item).then((saved) =>
                            {
                                syncedFiles.updated.push(saved);
                                done();
                            }).catch((err) =>
                            {
                                done(new Error(`Cannot save file: ${item.remote} : ${err.message}`));
                            });
                        },
                        (err) =>
                        {
                            if (err)
                            {
                                rejectWrap(err);
                            }
                            else
                            {
                                this.removeConfigs(removeFiles).then((removed) =>
                                {
                                    syncedFiles.removed = removed;
                                    resolveWrap(syncedFiles);
                                }).catch(rejectWrap);
                            }
                        }
                    );
                });
            }
            else
            {
                rejectWrap(new Error("Cannot save empty Gist files."));
            }
        });
    }

    /**
     * load items content. if load failed, the content will exactly be `null`.
     * @param {Array} p_items items of configs.
     * @returns {Promise}
     */
    _loadItemContent(p_items)
    {
        return new Promise((p_resolve) =>
        {
            let content;
            const result = p_items.map((item) =>
            {
                try
                {
                    if (item.name === "extensions")
                    {
                        content = JSON.stringify(this._extension.getAll() || [], null, 4);
                    }
                    else
                    {
                        content = fs.readFileSync(item.path, "utf8");
                    }
                }
                catch (err)
                {
                    content = null;
                }
                return Object.assign({}, item, { content });
            });
            p_resolve(result);
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
                    this._extension.sync(JSON.parse(p_item.content), true)
                        .then(p_resolve).catch(p_reject);
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
     * delete the physical files.
     * @param {Array} p_files files list.
     * @returns {Promise}
     */
    removeConfigs(p_files)
    {
        const removed = [];
        return new Promise((p_resolve, p_reject) =>
        {
            async.eachSeries(
                p_files,
                (item, done) =>
                {
                    fs.unlink(item.path, (err) =>
                    {
                        if (err)
                        {
                            done(new Error(`Cannot save file: ${item.remote} : ${err.message}`));
                        }
                        else
                        {
                            removed.push({ file: item });
                            done();
                        }
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
                        p_resolve(removed);
                    }
                }
            );
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
     * clear GitHub Personal Access Token and save to file.
     * @returns {Promise}
     */
    clearSyncingToken()
    {
        const settings = this.loadSyncingSettings();
        settings.token = "";
        return this.saveSyncingSettings(settings, false);
    }

    /**
     * clear Gist ID and save to file.
     * @returns {Promise}
     */
    clearSyncingID()
    {
        const settings = this.loadSyncingSettings();
        settings.id = "";
        return this.saveSyncingSettings(settings, false);
    }

    /**
     * prepare Syncing's settings for upload.
     * @param {Boolean} [p_showIndicator=false] default is false, don't show progress indicator.
     * @returns {Promise}
     */
    prepareUploadSettings(p_showIndicator = false)
    {
        // GitHub token must exist, but Gist ID could be none.
        return this.prepareSyncingSettings({ showIndicator: p_showIndicator });
    }

    /**
     * prepare Syncing's settings for download.
     * @param {Boolean} [p_showIndicator=false] default is false, don't show progress indicator.
     * @returns {Promise}
     */
    prepareDownloadSettings(p_showIndicator = false)
    {
        // GitHub token could be none, but Gist ID must exist.
        return this.prepareSyncingSettings({ forUpload: false, showIndicator: p_showIndicator });
    }

    /**
     * prepare Syncing's settings, will ask for settings if not exist.
     * @param {Object} [{ forUpload = true, showIndicator = false }={}]
     *     [forUpload=true]: default is true, GitHub token must exist, but Gist ID could be none when uploading, else, GitHub token could be none, but Gist ID must exist.
     *     [showIndicator=false]: default is false, don't show progress indicator.
     * @returns {Promise}
     */
    prepareSyncingSettings({ forUpload = true, showIndicator = false } = {})
    {
        // GitHub token could be none, but Gist ID must exist.
        return new Promise((p_resolve, p_reject) =>
        {
            function resolveWrap(p_value)
            {
                if (showIndicator)
                {
                    Toast.clearSpinner("");
                }
                p_resolve(p_value);
            }

            function rejectWrap(p_error)
            {
                if (showIndicator)
                {
                    Toast.statusError(`Syncing: ${forUpload ? "Uploading" : "Downloading"} canceled. ${p_error.message}`);
                }
                p_reject(p_error);
            }

            if (showIndicator)
            {
                Toast.showSpinner("Syncing: Checking Syncing's settings.");
            }

            const settings = this.loadSyncingSettings();
            if (settings.token && settings.id)
            {
                resolveWrap(settings);
            }
            else
            {
                let gistIDTask;
                if (settings.token)
                {
                    if (settings.id)
                    {
                        gistIDTask = Promise.resolve(settings.id);
                    }
                    else
                    {
                        gistIDTask = this._requestGistID(settings.token, forUpload);
                    }
                }
                else
                {
                    gistIDTask = Toast.showGitHubTokenInputBox(forUpload).then(({ token }) =>
                    {
                        settings.token = token;
                        if (settings.id)
                        {
                            return settings;
                        }
                        else
                        {
                            return this._requestGistID(token, forUpload);
                        }
                    });
                }

                gistIDTask.then(({ id }) =>
                {
                    settings.id = id;
                    this.saveSyncingSettings(settings).then(() => resolveWrap(settings));
                }).catch(rejectWrap);
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
     * @param {Boolean} [p_toast=true] default is true, toast error.
     * @returns {Promise}
     */
    saveSyncingSettings(p_json, p_toast = true)
    {
        return new Promise((p_resolve) =>
        {
            try
            {
                fs.writeFile(this._env.syncingSettingPath, JSON.stringify(p_json, null, 4) || "{}", (err) =>
                {
                    if (err && p_toast)
                    {
                        Toast.statusError(`Syncing: Cannot save Syncing's settings: ${err}`);
                    }
                    p_resolve();
                });
            }
            catch (err)
            {
                if (err && p_toast)
                {
                    Toast.statusError(`Syncing: Cannot save Syncing's settings: ${err}`);
                }
                p_resolve();
            }
        });
    }

    /**
     * ask user for Gist ID.
     *
     * @param {String} p_token GitHub Personal Access Token.
     * @param {Boolean} [p_forUpload=true] default is true, GitHub token must exist, but Gist ID could be none, else, GitHub token could be none, but Gist ID must exist.
     * @returns {Promise}
     */
    _requestGistID(p_token, p_forUpload = true)
    {
        if (p_token)
        {
            const api = Gist.create(p_token, this._env.getSyncingProxy());
            return Toast.showRemoteGistListBox(api, p_forUpload).then((value) =>
            {
                if (value.id)
                {
                    return value;
                }
                else
                {
                    // show gist input box when id is still null.
                    return Toast.showGistInputBox(p_forUpload);
                }
            });
        }
        else
        {
            return Toast.showGistInputBox(p_forUpload);
        }
    }
}

let _instance;
/**
 * create single instance.
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
