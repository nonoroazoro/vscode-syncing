import * as async from "async";
import * as fs from "fs";
import * as junk from "junk";
import * as path from "path";
import * as stripJsonComments from "strip-json-comments";
import * as vscode from "vscode";

import { diff } from "./Diff";
import Environment from "./Environment";
import Extension, { ISyncStatus } from "./Extension";
import Toast from "./Toast";
import * as GitHubTypes from "./types/GitHub";

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
 * VSCode configs wrapper.
 */
export default class Config
{
    private static _instance: Config;

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
     * Save VSCode settings to files.
     * @param files VSCode Configs from Gist.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    saveConfigs(files: GitHubTypes.IGistFiles, showIndicator: boolean = false): Promise<{
        updated: ISyncStatus[],
        removed: ISyncStatus[]
    }>
    {
        return new Promise((resolve, reject) =>
        {
            function resolveWrap(value: {
                updated: ISyncStatus[],
                removed: ISyncStatus[]
            })
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
                    let file: GitHubTypes.IGistFile;
                    for (const config of configs)
                    {
                        file = files[config.remote];
                        if (file)
                        {
                            // File exists in remote and local, sync it.
                            if (config.name === "extensions")
                            {
                                // Temp extensions file.
                                extensionsFile = {
                                    ...config,
                                    content: file.content
                                };
                            }
                            else
                            {
                                // Temp other file.
                                saveFiles.push({
                                    ...config,
                                    content: file.content
                                });
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

                    // poka-yoke - check if there have been two much changes (more than 10 changes) since the last downloading.
                    this._checkIfContinue(configs, saveFiles, removeFiles).then((value) =>
                    {
                        if (value)
                        {
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
                        }
                        else
                        {
                            rejectWrap(new Error("You abort the synchronization."));
                        }
                    });
                });
            }
            else
            {
                rejectWrap(new Error("Cannot find any files in your Gist."));
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
     * Get all snippet files.
     * @param snippetsDir Snippets dir.
     */
    private _getSnippets(snippetsDir: string): IConfig[]
    {
        const results: IConfig[] = [];
        try
        {
            const filenames: string[] = fs.readdirSync(snippetsDir);
            filenames.filter(junk.not).forEach((filename: string) =>
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
     * Load file content of configs.
     * The content will exactly be `undefined` when failure happens.
     * @param configs VSCode configs.
     */
    private _loadContent(configs: IConfig[]): Promise<IConfig[]>
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
    private _saveItemContent(item: IConfig): Promise<ISyncStatus>
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
     * Check if the downloading should be continued.
     */
    private _checkIfContinue(configs: IConfig[], saveFiles: IConfig[], removeFiles: IConfig[])
    {
        return new Promise((resolve) =>
        {
            this._loadContent(configs).then((loadedConfigs) =>
            {
                const changes = this._diff(loadedConfigs, saveFiles) + removeFiles.length;
                if (changes >= 10)
                {
                    const okButton = "Continue to Download";
                    const message = "The local settings have been changed a lot since your last download. Please make sure you've checked everything before you continue.";
                    Toast.showConfirmBox(message, okButton, "Cancel").then((selection) =>
                    {
                        resolve(selection === okButton);
                    });
                }
                else
                {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Calculates the number of differences between the local and remote files.
     */
    private _diff(localFiles: IConfig[], remoteFiles: IConfig[]): number
    {
        const left = this.parseIntoJSON(localFiles);
        const right = this.parseIntoJSON(remoteFiles);
        return diff(left, right);
    }

    /**
     * Converts the `content` of `IConfig[]` into an object.
     */
    private parseIntoJSON(files: IConfig[]): any
    {
        const result = {};
        files.forEach((f) =>
        {
            try
            {
                result[f.remote] = JSON.parse((stripJsonComments(f.content || "")));
            }
            catch (e)
            {
                result[f.remote] = f.content || "";
            }
        });
        return result;
    }
}
