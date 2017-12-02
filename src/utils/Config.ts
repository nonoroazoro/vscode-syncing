import * as async from "async";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

import Environment from "./Environment";
import Extension, { ISyncStatus } from "./Extension";
import Gist from "./Gist";
import Toast from "./Toast";

/**
 * Represent the type of VSCode configs.
 */
export enum ConfigTypes
{
    /**
     * Files.
     */
    File,

    /**
     * Folders.
     */
    Folder
}

/**
 * Represent a VSCode config.
 */
export interface IConfig
{
    /**
     * Config file name.
     */
    name: string;

    /**
     * Config file path in local.
     */
    path: string;

    /**
     * Config file name in remote.
     */
    remote: string;

    /**
     * Config file content.
     */
    content?: string;
}

/**
 * Represent the options of [getConfigs](#Config.getConfigs).
 */
export interface IGetConfigOptions
{
    /**
     * Whether to load the full list of VSCode settings. Defaults to `false`.
     */
    full?: boolean;

    /**
     * Whether to load the content of VSCode settings files. Defaults to `false`.
     */
    load?: boolean;

    /**
     * Whether to show the progress indicator. Defaults to `false`.
     */
    showIndicator?: boolean;
}

/**
 * Represent the settings of Syncing.
 */
export interface ISyncingSettings
{
    /**
     * Store GitHub Gist ID.
     */
    id: string;

    /**
     * Store GitHub Personal Access Token.
     */
    token: string;

    /**
     * Store http proxy setting.
     */
    http_proxy?: string;
}

/**
 * Syncing and VSCode configs wrapper.
 */
export default class Config
{
    private static _instance: Config;

    /**
     * Default settings of Syncing.
     */
    private static readonly DEFAULT_SETTINGS: ISyncingSettings = { id: "", token: "", http_proxy: "" };

    /**
     * Prefix of remote snippet files.
     */
    private static readonly SNIPPET_PREFIX: string = "snippet-";

    private _env: Environment;
    private _ext: Extension;

    private constructor(context: vscode.ExtensionContext)
    {
        this._env = Environment.create(context);
        this._ext = Extension.create(context);
    }

    /**
     * Create an instance of singleton class `Config`.
     */
    public static create(context: vscode.ExtensionContext): Config
    {
        if (!Config._instance)
        {
            Config._instance = new Config(context);
        }
        return Config._instance;
    }

    /**
     * Get VSCode settings list (will be uploaded or downloaded, anyway).
     * For example:
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
    public getConfigs({ full = false, load = false, showIndicator = false }: IGetConfigOptions = {}): Promise<IConfig[]>
    {
        return new Promise((resolve) =>
        {
            function resolveWrap(value: IConfig[])
            {
                if (showIndicator)
                {
                    Toast.clearSpinner("");
                }
                resolve(value);
            }

            if (showIndicator)
            {
                Toast.showSpinner("Syncing: Gathering local settings.");
            }

            // The item order is very important to ensure that the small files are synced first.
            // Thus, the extensions will be the last one to sync.
            const list: Array<{ name: string, type: ConfigTypes }> = [
                { name: "locale", type: ConfigTypes.File },
                { name: "snippets", type: ConfigTypes.Folder },
                { name: "extensions", type: ConfigTypes.File }
            ];

            if (full)
            {
                list.unshift(
                    { name: "settings-mac", type: ConfigTypes.File },
                    { name: "settings", type: ConfigTypes.File },
                    { name: "keybindings-mac", type: ConfigTypes.File },
                    { name: "keybindings", type: ConfigTypes.File }
                );
            }
            else
            {
                list.unshift(
                    this._env.isMac ? { name: "settings-mac", type: ConfigTypes.File }
                        : { name: "settings", type: ConfigTypes.File },
                    this._env.isMac ? { name: "keybindings-mac", type: ConfigTypes.File }
                        : { name: "keybindings", type: ConfigTypes.File }
                );
            }

            let temp: IConfig[];
            let localFilename: string;
            const results: IConfig[] = [];
            const errorFiles: string[] = [];
            async.eachSeries(
                list,
                (item, done) =>
                {
                    if (item.type === ConfigTypes.Folder)
                    {
                        // Attention: Snippets may be empty.
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
                                name: item.name,
                                path: path.join(
                                    this._env.codeUserPath,
                                    localFilename
                                ),
                                remote: `${item.name}.json`
                            }
                        ];
                    }

                    if (load)
                    {
                        this._loadContent(temp).then((values: IConfig[]) =>
                        {
                            values.forEach((value: IConfig) =>
                            {
                                // Check for success.
                                if (value.content)
                                {
                                    results.push(value);
                                }
                                else
                                {
                                    errorFiles.push(value.remote);
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
                    if (errorFiles.length > 0)
                    {
                        console.error(`Some of VSCode settings are invalid, which will be ignored: ${errorFiles.join(" ")}`);
                    }
                    resolveWrap(results);
                }
            );
        });
    }

    /**
     * Get all snippet files.
     * @param snippetsDir Snippets dir.
     */
    _getSnippets(snippetsDir: string): IConfig[]
    {
        const results: IConfig[] = [];
        try
        {
            const filenames: string[] = fs.readdirSync(snippetsDir);
            filenames.forEach((filename: string) =>
            {
                // Add prefix `snippet-` to all snippets.
                results.push({
                    name: filename,
                    path: path.join(snippetsDir, filename),
                    remote: `${Config.SNIPPET_PREFIX}${filename}`
                });
            });
        }
        catch (err)
        {
            console.error("Syncing: Error loading snippets.");
        }
        return results;
    }

    /**
     * Save VSCode settings to files.
     * @param files VSCode Configs from Gist.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    saveConfigs(files: any, showIndicator: boolean = false): Promise<{
        updated: ISyncStatus[],
        removed: ISyncStatus[]
    }>
    {
        return new Promise((resolve, reject) =>
        {
            function resolveWrap(value: any)
            {
                if (showIndicator)
                {
                    Toast.clearSpinner("");
                }
                resolve(value);
            }

            function rejectWrap(error: Error)
            {
                if (showIndicator)
                {
                    Toast.statusError(`Syncing: Downloading failed. ${error.message}`);
                }
                reject(error);
            }

            if (showIndicator)
            {
                Toast.showSpinner("Syncing: Downloading settings.");
            }

            if (files)
            {
                let extensionsFile: IConfig;
                const saveFiles: IConfig[] = [];
                const removeFiles: IConfig[] = [];
                const existsFileKeys: string[] = [];
                this.getConfigs().then((configs: IConfig[]) =>
                {
                    let file: any;
                    for (const config of configs)
                    {
                        file = files[config.remote];
                        if (file)
                        {
                            // File exists in remote and local, sync it.
                            if (config.name === "extensions")
                            {
                                // Temp extensions file.
                                extensionsFile = Object.assign({}, config, { content: file.content });
                            }
                            else
                            {
                                // Temp other file.
                                saveFiles.push(Object.assign({}, config, { content: file.content }));
                            }
                            existsFileKeys.push(config.remote);
                        }
                        else
                        {
                            // File exists in remote, but not exists in local.
                            // Delete if it's a snippet file.
                            if (config.remote.startsWith(Config.SNIPPET_PREFIX))
                            {
                                removeFiles.push(config);
                            }
                        }
                    }

                    let filename: string;
                    for (const key of Object.keys(files))
                    {
                        if (existsFileKeys.indexOf(key) === -1)
                        {
                            file = files[key];
                            if (file.filename.startsWith(Config.SNIPPET_PREFIX))
                            {
                                filename = file.filename.slice(Config.SNIPPET_PREFIX.length);
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
                                // Unknown files, do not process.
                            }
                        }
                    }

                    // Put extensions file to the last.
                    if (extensionsFile)
                    {
                        saveFiles.push(extensionsFile);
                    }

                    const syncedFiles: {
                        updated: ISyncStatus[],
                        removed: ISyncStatus[]
                    } = { updated: [], removed: [] };
                    async.eachSeries(
                        saveFiles,
                        (item: IConfig, done: async.ErrorCallback<Error>) =>
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
     * Load file content of configs.
     * The content will exactly be `undefined` when failure happens.
     * @param configs VSCode configs.
     */
    _loadContent(configs: IConfig[]): Promise<IConfig[]>
    {
        return new Promise((resolve) =>
        {
            let content: string | undefined;
            const results: IConfig[] = configs.map((item: IConfig) =>
            {
                try
                {
                    if (item.name === "extensions")
                    {
                        content = JSON.stringify(this._ext.getAll(), null, 4);
                    }
                    else
                    {
                        content = fs.readFileSync(item.path, "utf8");
                    }
                }
                catch (e)
                {
                    content = undefined;
                    console.error(`Syncing: Error loading config file: ${item.name}.\n${e}`);
                }
                return Object.assign({}, item, { content });
            });
            resolve(results);
        });
    }

    /**
     * Save item content to file or sync extensions.
     * @param item Item of configs.
     */
    _saveItemContent(item: IConfig): Promise<ISyncStatus>
    {
        return new Promise((resolve, reject) =>
        {
            if (item.name === "extensions")
            {
                if (item.content)
                {
                    try
                    {
                        // Sync extensions.
                        this._ext.sync(JSON.parse(item.content), true).then(resolve).catch(reject);
                    }
                    catch (err)
                    {
                        reject(err);
                    }
                }
                else
                {
                    reject(new Error("Invalid config content."));
                }
            }
            else
            {
                // Save files.
                fs.writeFile(item.path, item.content || "{}", (err) =>
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else
                    {
                        resolve({ file: item });
                    }
                });
            }
        });
    }

    /**
     * Delete the physical files.
     * @param files Files list.
     */
    removeConfigs(files: IConfig[]): Promise<ISyncStatus[]>
    {
        return new Promise((resolve, reject) =>
        {
            const removed: ISyncStatus[] = [];
            async.eachSeries(
                files,
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
                        reject(err);
                    }
                    else
                    {
                        resolve(removed);
                    }
                }
            );
        });
    }

    /**
     * Init Syncing settings file.
     */
    initSyncingSettings(): Promise<void>
    {
        return this.saveSyncingSettings(Config.DEFAULT_SETTINGS);
    }

    /**
     * Upgrade Syncing settings file (only used for http proxy settings change).
     */
    upgradeSyncingSettings(): Promise<void>
    {
        return this.saveSyncingSettings(this.loadSyncingSettings());
    }

    /**
     * Clear GitHub Personal Access Token and save to file.
     */
    clearSyncingToken(): Promise<void>
    {
        const settings: ISyncingSettings = this.loadSyncingSettings();
        settings.token = "";
        return this.saveSyncingSettings(settings);
    }

    /**
     * Clear Gist ID and save to file.
     */
    clearSyncingID(): Promise<void>
    {
        const settings: ISyncingSettings = this.loadSyncingSettings();
        settings.id = "";
        return this.saveSyncingSettings(settings);
    }

    /**
     * Prepare Syncing's settings for uploading.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    prepareUploadSettings(showIndicator: boolean = false): Promise<ISyncingSettings>
    {
        // GitHub Token must exist, but Gist ID could be none.
        return this.prepareSyncingSettings(true, showIndicator);
    }

    /**
     * Prepare Syncing's settings for downloading.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    prepareDownloadSettings(showIndicator: boolean = false): Promise<ISyncingSettings>
    {
        // GitHub Token could be none, but Gist ID must exist.
        return this.prepareSyncingSettings(false, showIndicator);
    }

    /**
     * Prepare Syncing's settings, will ask for settings if not exist.
     * @param forUpload Whether to show messages for upload. Defaults to `true`.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    prepareSyncingSettings(forUpload: boolean = true, showIndicator: boolean = false): Promise<ISyncingSettings>
    {
        return new Promise((resolve, reject) =>
        {
            function resolveWrap(value: ISyncingSettings)
            {
                if (showIndicator)
                {
                    Toast.clearSpinner("");
                }
                resolve(value);
            }

            function rejectWrap(error: Error)
            {
                if (showIndicator)
                {
                    Toast.statusError(`Syncing: ${forUpload ? "Uploading" : "Downloading"} canceled. ${error.message}`);
                }
                reject(error);
            }

            if (showIndicator)
            {
                Toast.showSpinner("Syncing: Checking Syncing's settings.");
            }

            const settings: ISyncingSettings = this.loadSyncingSettings();
            if (settings.token && settings.id)
            {
                resolveWrap(settings);
            }
            else
            {
                let gistIDTask: Promise<{ id: string }>;
                if (settings.token)
                {
                    if (settings.id)
                    {
                        gistIDTask = Promise.resolve({ id: settings.id });
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
                    this.saveSyncingSettings(settings, true).then(() => resolveWrap(settings));
                }).catch(rejectWrap);
            }
        });
    }

    /**
     * Load Syncing's settings (load from settings file: `syncing.json`).
     */
    loadSyncingSettings(): ISyncingSettings
    {
        const settings: ISyncingSettings = Object.assign({}, Config.DEFAULT_SETTINGS);
        try
        {
            Object.assign(
                settings,
                JSON.parse(fs.readFileSync(this._env.syncingSettingsPath, "utf8"))
            );
        }
        catch (err)
        {
            console.error(`Syncing: Error loading Syncing's settings: ${err}`);
        }
        return settings;
    }

    /**
     * Save Syncing's settings to file: `syncing.json`.
     * @param settings Syncing's Settings.
     * @param showToast Whether to show error toast. Defaults to `false`.
     */
    saveSyncingSettings(settings: ISyncingSettings, showToast: boolean = false): Promise<void>
    {
        return new Promise((resolve) =>
        {
            const content = JSON.stringify(settings, null, 4) || "{}";
            fs.writeFile(this._env.syncingSettingsPath, content, (err) =>
            {
                if (err && showToast)
                {
                    Toast.statusError(`Syncing: Cannot save Syncing's settings: ${err}`);
                }
                resolve();
            });
        });
    }

    /**
     * Ask user for Gist ID.
     *
     * @param token GitHub Personal Access Token.
     * @param forUpload Whether to show messages for upload. Defaults to `true`.
     */
    _requestGistID(token: string, forUpload: boolean = true): Promise<{ id: string }>
    {
        if (token)
        {
            const api: Gist = Gist.create(token, this._env.syncingProxy);
            return Toast.showRemoteGistListBox(api, forUpload).then((value) =>
            {
                if (value.id === "")
                {
                    // Show gist input box when id is still null.
                    return Toast.showGistInputBox(forUpload);
                }
                else
                {
                    return value;
                }
            });
        }
        else
        {
            return Toast.showGistInputBox(forUpload);
        }
    }
}
