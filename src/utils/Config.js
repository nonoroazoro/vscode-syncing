/**
 * Syncing's config.
 */

const fs = require("fs");
const path = require("path");
const async = require("async");

const Extension = require("./Extension");
const Environment = require("./Environment");

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
                    this._extension.install(JSON.parse(p_item.content)).then((saved) =>
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
                const temp = "D:\\Downloads\\vscode";
                fs.writeFile(path.join(temp, p_item.remote), p_item.content || "{}", (err) =>
                // fs.writeFile(p_item.path, p_item.content || "{}", (err) =>
                {
                    if (err)
                    {
                        p_reject(err);
                    }
                    else
                    {
                        p_resolve(p_item);
                    }
                });
            }
        });
    }

    /**
     * load Syncing's settings (load from settings file: `syncing.json`).
     * @returns {Promise}
     */
    loadSyncingSettings()
    {
        return new Promise((p_resolve, p_reject) =>
        {
            if (this._env.codeUserPath)
            {
                const filename = "syncing.json";
                const filepath = path.join(this._env.codeUserPath, filename);
                if (fs.existsSync(filepath))
                {
                    fs.readFile(filepath, "utf8", (err, res) =>
                    {
                        if (err)
                        {
                            p_reject(new Error(`Cannot read Syncing's Settings file: ${filename}.`));
                        }
                        else
                        {
                            try
                            {
                                p_resolve(JSON.parse(res));
                            }
                            catch (e)
                            {
                                p_reject(new Error(`Cannot read Syncing's Settings file: ${filename} : Syntax Error`));
                            }
                        }
                    });
                }
                else
                {
                    p_reject(new Error(`Cannot find Syncing's Settings file: ${filename}.`));
                }
            }
            else
            {
                p_reject(new Error("Cannot find VSCode's Settings folder."));
            }
        });
    }
}

module.exports = Config;
