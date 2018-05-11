import * as async from "async";
import * as fs from "fs-extra";
import * as junk from "junk";
import * as path from "path";
import * as vscode from "vscode";

import { CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD, SETTINGS_UPLOAD_EXCLUDE } from "../common/constants";
import * as GitHubTypes from "../common/GitHubTypes";
import { IExtension, ISetting, ISyncedItem, SettingTypes } from "../common/types";
import { diff } from "../utils/diffHelper";
import { excludeSettings, mergeSettings, parse } from "../utils/jsonHelper";
import Environment from "./Environment";
import Extension from "./Extension";
import * as Toast from "./Toast";

/**
 * `VSCode Settings` wrapper.
 */
export default class VSCodeSetting
{
    private static _instance: VSCodeSetting;

    /**
     * Suffix of remote mac files.
     */
    private static readonly MAC_SUFFIX: string = "-mac";

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
     * Create an instance of singleton class `VSCodeSetting`.
     */
    public static create(context: vscode.ExtensionContext): VSCodeSetting
    {
        if (!VSCodeSetting._instance)
        {
            VSCodeSetting._instance = new VSCodeSetting(context);
        }
        return VSCodeSetting._instance;
    }

    /**
     * Get `VSCode Settings` (will be uploaded or downloaded, anyway).
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
     * @param {boolean} [loadFileContent=false] Whether to load the content of `VSCode Settings` files. Defaults to `false`.
     * @param {boolean} [showIndicator=false] Whether to show the progress indicator. Defaults to `false`.
     */
    public getSettings(loadFileContent: boolean = false, showIndicator: boolean = false): Promise<ISetting[]>
    {
        return new Promise((resolve) =>
        {
            function resolveWrap(value: ISetting[])
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

            // Note that this is an ordered list, to ensure that the smaller files (such as `settings.json`, `keybindings.json`) are synced first.
            // Thus, the extensions will be the last one to sync.
            const settingsList = [
                SettingTypes.Settings,
                SettingTypes.Keybindings,
                SettingTypes.Locale,
                SettingTypes.Snippets,
                SettingTypes.Extensions
            ];

            let tempSettings: ISetting[];
            let localFilename: string;
            let remoteFilename: string;
            const results: ISetting[] = [];
            const errorFiles: string[] = [];
            async.eachSeries(
                settingsList,
                (type, done) =>
                {
                    if (type === SettingTypes.Snippets)
                    {
                        // Attention: Snippets may be empty.
                        tempSettings = this._getSnippets(this._env.snippetsPath);
                    }
                    else
                    {
                        localFilename = `${type}.json`;
                        remoteFilename = localFilename;
                        if (type === SettingTypes.Settings || type === SettingTypes.Keybindings)
                        {
                            remoteFilename = this._env.isMac
                                ? `${type}${VSCodeSetting.MAC_SUFFIX}.json`
                                : `${type}.json`;
                        }

                        tempSettings = [
                            {
                                filepath: path.join(this._env.codeUserPath, localFilename),
                                remoteFilename,
                                type
                            }
                        ];
                    }

                    if (loadFileContent)
                    {
                        this._loadContent(tempSettings).then((values: ISetting[]) =>
                        {
                            values.forEach((value: ISetting) =>
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
                        results.push(...tempSettings);
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
     * Save `VSCode Settings` to files.
     * @param files `VSCode Settings` from GitHub Gist.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    saveSettings(files: GitHubTypes.IGistFiles, showIndicator: boolean = false): Promise<{
        updated: ISyncedItem[],
        removed: ISyncedItem[]
    }>
    {
        return new Promise((resolve, reject) =>
        {
            function resolveWrap(value: {
                updated: ISyncedItem[],
                removed: ISyncedItem[]
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
                let extensionsSetting: ISetting;
                const settingsToSave: ISetting[] = [];
                const settingsToRemove: ISetting[] = [];
                const existsFileKeys: string[] = [];
                this.getSettings().then((settings: ISetting[]) =>
                {
                    let gistFile: GitHubTypes.IGistFile;
                    for (const setting of settings)
                    {
                        gistFile = files[setting.remoteFilename];
                        if (gistFile)
                        {
                            // File exists in remote and local, sync it.
                            if (setting.type === SettingTypes.Extensions)
                            {
                                // Temp extensions file.
                                extensionsSetting = {
                                    ...setting,
                                    content: gistFile.content
                                };
                            }
                            else
                            {
                                // Temp other file.
                                settingsToSave.push({
                                    ...setting,
                                    content: gistFile.content
                                });
                            }
                            existsFileKeys.push(setting.remoteFilename);
                        }
                        else
                        {
                            // File exists in remote, but not exists in local.
                            // Delete if it's a snippet file.
                            if (setting.type === SettingTypes.Snippets)
                            {
                                settingsToRemove.push(setting);
                            }
                        }
                    }

                    let filename: string;
                    for (const key of Object.keys(files))
                    {
                        if (existsFileKeys.indexOf(key) === -1)
                        {
                            gistFile = files[key];
                            if (gistFile.filename.startsWith(VSCodeSetting.SNIPPET_PREFIX))
                            {
                                // Snippets.
                                filename = gistFile.filename.slice(VSCodeSetting.SNIPPET_PREFIX.length);
                                if (filename)
                                {
                                    settingsToSave.push({
                                        content: gistFile.content,
                                        filepath: this._env.getSnippetFilePath(filename),
                                        remoteFilename: gistFile.filename,
                                        type: SettingTypes.Snippets
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
                    if (extensionsSetting)
                    {
                        settingsToSave.push(extensionsSetting);
                    }

                    // poka-yoke - check if there have been two much changes (more than 10 changes) since the last downloading.
                    this._shouldContinue(settings, settingsToSave, settingsToRemove).then((value) =>
                    {
                        if (value)
                        {
                            const syncedItems: {
                                updated: ISyncedItem[],
                                removed: ISyncedItem[]
                            } = { updated: [], removed: [] };
                            async.eachSeries(
                                settingsToSave,
                                (setting: ISetting, done: async.ErrorCallback<Error>) =>
                                {
                                    this._saveSetting(setting).then((saved) =>
                                    {
                                        syncedItems.updated.push(saved);
                                        done();
                                    }).catch((err) =>
                                    {
                                        done(new Error(`Cannot save file: ${setting.remoteFilename} : ${err.message}`));
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
                                        this.removeSettings(settingsToRemove).then((removed) =>
                                        {
                                            syncedItems.removed = removed;
                                            resolveWrap(syncedItems);
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
     * Delete the physical files corresponding to the `VSCode Settings`.
     * @param settings `VSCode Settings`.
     */
    removeSettings(settings: ISetting[]): Promise<ISyncedItem[]>
    {
        return new Promise((resolve, reject) =>
        {
            const removed: ISyncedItem[] = [];
            async.eachSeries(
                settings,
                (item, done) =>
                {
                    fs.remove(item.filepath).then(() =>
                    {
                        removed.push({ setting: item });
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
     * Get all local snippet files.
     * @param snippetsDir Snippets dir.
     */
    private _getSnippets(snippetsDir: string): ISetting[]
    {
        const results: ISetting[] = [];
        try
        {
            const filenames: string[] = fs.readdirSync(snippetsDir);
            filenames.filter(junk.not).forEach((filename: string) =>
            {
                // Add prefix to all snippets.
                results.push({
                    filepath: path.join(snippetsDir, filename),
                    remoteFilename: `${VSCodeSetting.SNIPPET_PREFIX}${filename}`,
                    type: SettingTypes.Snippets
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
     * Load the content of `VSCode Settings` files. The `content` will exactly be `undefined` when failure happens.
     *
     * @param settings `VSCode Settings`.
     * @param exclude Default is `true`, exclude some `VSCode Settings` base on the exclude list of `Syncing`.
     */
    private _loadContent(settings: ISetting[], exclude: boolean = true): Promise<ISetting[]>
    {
        return new Promise((resolve) =>
        {
            let content: string | undefined;
            const results: ISetting[] = settings.map((setting: ISetting) =>
            {
                try
                {
                    if (setting.type === SettingTypes.Extensions)
                    {
                        content = JSON.stringify(this._ext.getAll(), null, 4);
                    }
                    else
                    {
                        content = fs.readFileSync(setting.filepath, "utf8");
                    }
                }
                catch (err)
                {
                    content = undefined;
                    console.error(`Syncing: Error loading VSCode settings file: ${setting.type}.\n${err}`);
                }

                // Exclude settings.
                if (exclude && setting.type === SettingTypes.Settings && content)
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

                return { ...setting, content };
            });
            resolve(results);
        });
    }

    /**
     * Save `VSCode Setting` to file or sync extensions.
     *
     * @param setting `VSCode Setting`.
     */
    private _saveSetting(setting: ISetting): Promise<ISyncedItem>
    {
        return new Promise((resolve, reject) =>
        {
            if (setting.type === SettingTypes.Extensions)
            {
                try
                {
                    // Sync extensions.
                    const extensions: IExtension[] = parse(setting.content || "[]");
                    this._ext.sync(extensions, true).then(resolve).catch(reject);
                }
                catch (err)
                {
                    reject(new Error(`The extension list is broken: ${err.message}`));
                }
            }
            else if (setting.type === SettingTypes.Settings && setting.content)
            {
                // TODO: refactor.
                // Merge settings.
                let { content } = setting;
                this._loadContent([setting], false).then((value) =>
                {
                    const localSettings = value[0].content;
                    if (localSettings)
                    {
                        content = mergeSettings(content, localSettings);
                    }

                    // Save to disk.
                    this._saveToFile({ ...setting, content }).then(resolve).catch(reject);
                });
            }
            else
            {
                // Save to disk.
                this._saveToFile(setting).then(resolve).catch(reject);
            }
        });
    }

    /**
     * Save the `VSCode Setting` to disk.
     */
    private _saveToFile(setting: ISetting)
    {
        return fs.outputFile(setting.filepath, setting.content || "{}").then(() => ({ setting } as ISyncedItem));
    }

    /**
     * Check if the downloading should be continued.
     */
    private _shouldContinue(settings: ISetting[], settingsToSave: ISetting[], settingsToRemove: ISetting[])
    {
        return new Promise((resolve) =>
        {
            const threshold = vscode.workspace.getConfiguration(CONFIGURATION_KEY).get<number>(CONFIGURATION_POKA_YOKE_THRESHOLD);
            if (threshold > 0)
            {
                this._loadContent(settings, false).then((localConfigs) =>
                {
                    // poka-yoke - check if there have been two much changes (more than 10 changes) since the last uploading.
                    // 1. Get the excluded settings.
                    const remoteConfigs = settingsToSave.map((setting) => ({ ...setting }));
                    const remoteSettings = remoteConfigs.find((setting) => (setting.type === SettingTypes.Settings));
                    const localSettings = localConfigs.find((setting) => (setting.type === SettingTypes.Settings));
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
                    const changes = this._diffSettings(localConfigs, remoteConfigs) + settingsToRemove.length;
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
     * Calculates the number of differences between the local and remote settings.
     */
    private _diffSettings(localSettings: ISetting[], remoteSettings: ISetting[]): number
    {
        const left = this._parseToJSON(localSettings);
        const right = this._parseToJSON(remoteSettings);
        return diff(left, right);
    }

    /**
     * Converts the `content` of `ISetting[]` into a `JSON object`.
     */
    private _parseToJSON(settings: ISetting[]): any
    {
        const result = {};
        let content: string;
        for (const setting of settings)
        {
            content = setting.content || "";
            result[setting.remoteFilename] = parse(content) || content;
        }
        return result;
    }
}
