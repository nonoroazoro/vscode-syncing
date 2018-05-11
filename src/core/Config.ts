import * as async from "async";
import * as fs from "fs-extra";
import * as junk from "junk";
import * as path from "path";
import * as vscode from "vscode";

import { CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD, SETTINGS_UPLOAD_EXCLUDE } from "../common/constants";
import { diff } from "../utils/diffHelper";
import { excludeSettings, mergeSettings, parse } from "../utils/jsonHelper";
import Environment from "./Environment";
import Extension, { IExtension, ISyncStatus } from "./Extension";
import * as GitHubTypes from "./GitHubTypes";
import * as Toast from "./Toast";

/**
 * Represent the type of VSCode settings.
 */
export enum ConfigTypes
{
    Extensions,

    Keybindings,

    Locale,

    Settings,

    Snippets
}

/**
 * Represent a VSCode settings.
 */
export interface IConfig
{
    /**
     * Settings filename.
     */
    name: string;

    /**
     * Settings content.
     */
    content?: string;

    /**
     * Settings local filepath.
     */
    filepath: string;

    /**
     * Settings filename in GitHub Gist.
     */
    remoteFilename: string;

    /**
     * Settings type.
     */
    type: ConfigTypes;
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
     *
     * @param {boolean} [load=false] Whether to load the content of VSCode settings files. Defaults to `false`.
     * @param {boolean} [showIndicator=false] Whether to show the progress indicator. Defaults to `false`.
     * @param {boolean} [full=false] Whether to load the full list of VSCode settings. Defaults to `false`.
     */
    public getConfigs(load = false, showIndicator = false, full = false): Promise<IConfig[]>
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

            // The item order is very important to ensure that the smaller files are synced first.
            // Thus, the extensions will be the last one to sync.
            const list = [
                { name: "locale", type: ConfigTypes.Locale },
                { name: "snippets", type: ConfigTypes.Snippets },
                { name: "extensions", type: ConfigTypes.Extensions }
            ];

            if (full)
            {
                list.unshift(
                    { name: "settings-mac", type: ConfigTypes.Settings },
                    { name: "settings", type: ConfigTypes.Settings },
                    { name: "keybindings-mac", type: ConfigTypes.Keybindings },
                    { name: "keybindings", type: ConfigTypes.Keybindings }
                );
            }
            else
            {
                list.unshift(
                    this._env.isMac ? { name: "settings-mac", type: ConfigTypes.Settings }
                        : { name: "settings", type: ConfigTypes.Settings },
                    this._env.isMac ? { name: "keybindings-mac", type: ConfigTypes.Keybindings }
                        : { name: "keybindings", type: ConfigTypes.Keybindings }
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
                    if (item.type === ConfigTypes.Snippets)
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
                                filepath: path.join(
                                    this._env.codeUserPath,
                                    localFilename
                                ),
                                remoteFilename: `${item.name}.json`,
                                type: item.type
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
                                    errorFiles.push(value.remoteFilename);
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
                        file = files[config.remoteFilename];
                        if (file)
                        {
                            // File exists in remote and local, sync it.
                            if (config.type === ConfigTypes.Extensions)
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
                            existsFileKeys.push(config.remoteFilename);
                        }
                        else
                        {
                            // File exists in remote, but not exists in local.
                            // Delete if it's a snippet file.
                            if (config.remoteFilename.startsWith(Config.SNIPPET_PREFIX))
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
                                // Snippets.
                                filename = file.filename.slice(Config.SNIPPET_PREFIX.length);
                                if (filename)
                                {
                                    saveFiles.push({
                                        content: file.content,
                                        name: filename,
                                        filepath: this._env.getSnippetFilePath(filename),
                                        remoteFilename: file.filename,
                                        type: ConfigTypes.Snippets
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
                                        done(new Error(`Cannot save file: ${item.remoteFilename} : ${err.message}`));
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
                    fs.remove(item.filepath).then(() =>
                    {
                        removed.push({ file: item });
                        done();
                    }).catch((err) =>
                    {
                        done(new Error(`Cannot save file: ${item.remoteFilename} : ${err.message}`));
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
                    filepath: path.join(snippetsDir, filename),
                    remoteFilename: `${Config.SNIPPET_PREFIX}${filename}`,
                    type: ConfigTypes.Snippets
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
     * @param exclude Default is `true`, exclude the VSCode settings base on the exclude list of Syncing.
     */
    private _loadContent(configs: IConfig[], exclude: boolean = true): Promise<IConfig[]>
    {
        return new Promise((resolve) =>
        {
            let content: string | undefined;
            const results: IConfig[] = configs.map((item: IConfig) =>
            {
                try
                {
                    if (item.type === ConfigTypes.Extensions)
                    {
                        content = JSON.stringify(this._ext.getAll(), null, 4);
                    }
                    else
                    {
                        content = fs.readFileSync(item.filepath, "utf8");
                    }
                }
                catch (e)
                {
                    content = undefined;
                    console.error(`Syncing: Error loading config file: ${item.name}.\n${e}`);
                }

                // Exclude settings.
                if (exclude && item.type === ConfigTypes.Settings && content)
                {
                    const settingsJSON = parse(content);
                    if (settingsJSON)
                    {
                        content = excludeSettings(
                            content,
                            settingsJSON,
                            (settingsJSON[SETTINGS_UPLOAD_EXCLUDE] || [])
                        );
                    }
                }

                return { ...item, content };
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
            if (item.type === ConfigTypes.Extensions)
            {
                try
                {
                    // Sync extensions.
                    const extensions: IExtension[] = parse(item.content || "[]");
                    this._ext.sync(extensions, true).then(resolve).catch(reject);
                }
                catch (err)
                {
                    reject(new Error(`The extension list is broken: ${err.message}`));
                }
            }
            else if (item.type === ConfigTypes.Settings && item.content)
            {
                // TODO: refactor.
                // Merge settings.
                let { content } = item;
                this._loadContent([item], false).then((value) =>
                {
                    const localSettings = value[0].content;
                    if (localSettings)
                    {
                        content = mergeSettings(content, localSettings);
                    }

                    // Save to disk.
                    this._saveToFile({ ...item, content }).then(resolve).catch(reject);
                });
            }
            else
            {
                // Save to disk.
                this._saveToFile(item).then(resolve).catch(reject);
            }
        });
    }

    /**
     * Save the config to disk.
     */
    private _saveToFile(config: IConfig)
    {
        return fs.outputFile(config.filepath, config.content || "{}").then(() => ({ file: config }));
    }

    /**
     * Check if the downloading should be continued.
     */
    private _checkIfContinue(configs: IConfig[], saveFiles: IConfig[], removeFiles: IConfig[])
    {
        return new Promise((resolve) =>
        {
            const threshold = vscode.workspace.getConfiguration(CONFIGURATION_KEY).get<number>(CONFIGURATION_POKA_YOKE_THRESHOLD);
            if (threshold > 0)
            {
                this._loadContent(configs, false).then((localConfigs) =>
                {
                    // poka-yoke - check if there have been two much changes (more than 10 changes) since the last uploading.
                    // 1. Get the excluded settings.
                    const remoteConfigs = saveFiles.map((file) => ({ ...file }));
                    const remoteSettings = remoteConfigs.find((item) => (item.type === ConfigTypes.Settings));
                    const localSettings = localConfigs.find((item) => (item.type === ConfigTypes.Settings));
                    if (remoteSettings && remoteSettings.content && localSettings && localSettings.content)
                    {
                        const localSettingsJSON = parse(localSettings.content);
                        const remoteSettingsJSON = parse(remoteSettings.content);
                        if (localSettingsJSON && remoteSettingsJSON)
                        {
                            const patterns = remoteSettingsJSON[SETTINGS_UPLOAD_EXCLUDE] || [];
                            remoteSettings.content = excludeSettings(remoteSettings.content, remoteSettingsJSON, patterns);
                            localSettings.content = excludeSettings(localSettings.content, localSettingsJSON, patterns);
                        }
                    }

                    // 2. Diff settings.
                    const changes = this._diffSettings(localConfigs, remoteConfigs) + removeFiles.length;
                    if (changes >= threshold)
                    {
                        const okButton = "Continue to download";
                        const message = "A lot of changes have been made since your last sync. Are you sure to OVERWRITE THE LOCAL SETTINGS?";
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
            }
            else
            {
                resolve(true);
            }
        });
    }

    /**
     * Calculates the number of differences between the local and remote files.
     */
    private _diffSettings(localFiles: IConfig[], remoteFiles: IConfig[]): number
    {
        const left = this._parseToJSON(localFiles);
        const right = this._parseToJSON(remoteFiles);
        return diff(left, right);
    }

    /**
     * Converts the `content` of `IConfig[]` into a `JSON object`.
     */
    private _parseToJSON(configs: IConfig[]): any
    {
        const result = {};
        let content: string;
        for (const config of configs)
        {
            content = config.content || "";
            result[config.remoteFilename] = parse(content) || content;
        }
        return result;
    }
}
