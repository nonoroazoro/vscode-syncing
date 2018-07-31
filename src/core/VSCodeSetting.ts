import * as async from "async";
import * as fs from "fs-extra";
import * as junk from "junk";
import * as minimatch from "minimatch";
import * as path from "path";
import * as vscode from "vscode";

import
{
    CONFIGURATION_EXCLUDED_EXTENSIONS,
    CONFIGURATION_EXCLUDED_SETTINGS,
    CONFIGURATION_KEY,
    CONFIGURATION_POKA_YOKE_THRESHOLD,
    SETTING_EXCLUDED_EXTENSIONS,
    SETTING_EXCLUDED_SETTINGS
} from "../common/constants";
import * as GitHubTypes from "../common/GitHubTypes";
import { IExtension, ISetting, ISyncedItem, SettingTypes } from "../common/types";
import { diff } from "../utils/diffPatch";
import { excludeSettings, mergeSettings, parse } from "../utils/jsonc";
import { getVSCodeSetting } from "../utils/vscodeAPI";
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
                        if (type === SettingTypes.Keybindings)
                        {
                            // Separate the keybindings.
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
    public saveSettings(files: GitHubTypes.IGistFiles, showIndicator: boolean = false): Promise<{
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

                                // TODO: remove the next line in the next release.
                                setting.content = (setting.content || "[]").toLowerCase();

                                // TODO: remove || "[]").toLowerCase() in the next release.
                                extensionsSetting = {
                                    ...setting,
                                    content: (gistFile.content || "[]").toLowerCase()
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
                                // Unknown files, don't care.
                            }
                        }
                    }

                    // Put extensions file to the last.
                    if (extensionsSetting)
                    {
                        settingsToSave.push(extensionsSetting);
                    }

                    // poka-yoke - check if there have been two much changes since the last downloading.
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
    public removeSettings(settings: ISetting[]): Promise<ISyncedItem[]>
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
                        done(new Error(`Cannot remove settings file: ${item.remoteFilename} : ${err.message}`));
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
                        // Exclude extensions.
                        let extensions = this._ext.getAll();
                        if (exclude && extensions.length > 0)
                        {
                            const patterns = getVSCodeSetting<string[]>(CONFIGURATION_KEY, CONFIGURATION_EXCLUDED_EXTENSIONS);
                            extensions = this._getExcludedExtensions(extensions, patterns);
                        }
                        content = JSON.stringify(extensions, null, 4);
                    }
                    else
                    {
                        content = fs.readFileSync(setting.filepath, "utf8");

                        // Exclude settings.
                        if (exclude && content && setting.type === SettingTypes.Settings)
                        {
                            const settingsJSON = parse(content);
                            if (settingsJSON)
                            {
                                const patterns = getVSCodeSetting<string[]>(CONFIGURATION_KEY, CONFIGURATION_EXCLUDED_SETTINGS);
                                content = excludeSettings(content, settingsJSON, patterns);
                            }
                        }
                    }
                }
                catch (err)
                {
                    content = undefined;
                    console.error(`Syncing: Error loading VSCode settings file: ${setting.type}.\n${err}`);
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
    private async _saveSetting(setting: ISetting): Promise<ISyncedItem>
    {
        let result: ISyncedItem;
        if (setting.type === SettingTypes.Extensions)
        {
            // Sync extensions.
            const extensions: IExtension[] = parse(setting.content || "[]");
            result = await this._ext.sync(extensions, true);
        }
        else
        {
            let settingsToSave = setting.content;
            if (setting.type === SettingTypes.Settings && settingsToSave)
            {
                // Sync settings.
                const localFiles = await this._loadContent([setting], false);
                const localSettings = localFiles[0] && localFiles[0].content;
                if (localSettings)
                {
                    // Merge remote and local settings.
                    settingsToSave = mergeSettings(settingsToSave, localSettings);
                }
            }

            // Save to disk.
            result = await this._saveToFile({ ...setting, content: settingsToSave });
        }
        return result;
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
            const threshold = getVSCodeSetting<number>(CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD);
            if (threshold > 0)
            {
                this._loadContent(settings, false).then((localSettings) =>
                {
                    // poka-yoke - check if there have been two much changes since the last uploading.
                    // 1. Excluded settings.
                    // Here clone the settings to avoid manipulation.
                    let excludedSettings = this._excludeSettings(
                        localSettings,
                        settingsToSave.map((setting) => ({ ...setting })),
                        SettingTypes.Settings
                    );

                    // 2. Excluded extensions.
                    excludedSettings = this._excludeSettings(
                        excludedSettings.localSettings,
                        excludedSettings.remoteSettings,
                        SettingTypes.Extensions
                    );

                    // 3. Diff settings.
                    const changes = settingsToRemove.length + this._diffSettings(
                        excludedSettings.localSettings,
                        excludedSettings.remoteSettings
                    );
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
     * Excludes settings based on the excluded setting of remote settings.
     */
    private _excludeSettings(localSettings: ISetting[], remoteSettings: ISetting[], type: SettingTypes)
    {
        const lSetting = localSettings.find((setting) => (setting.type === type));
        const rSetting = remoteSettings.find((setting) => (setting.type === type));
        if (lSetting && lSetting.content && rSetting && rSetting.content)
        {
            const lSettingJSON = parse(lSetting.content);
            const rSettingJSON = parse(rSetting.content);
            if (lSettingJSON && rSettingJSON)
            {
                if (type === SettingTypes.Settings)
                {
                    // Exclude settings.
                    const patterns = rSettingJSON[SETTING_EXCLUDED_SETTINGS] || [];
                    lSetting.content = excludeSettings(lSetting.content, lSettingJSON, patterns);
                    rSetting.content = excludeSettings(rSetting.content, rSettingJSON, patterns);
                }
                else if (type === SettingTypes.Extensions)
                {
                    // Exclude extensions.
                    const rVSCodeSettings = remoteSettings.find((setting) => (setting.type === SettingTypes.Settings));
                    if (rVSCodeSettings && rVSCodeSettings.content)
                    {
                        const rVSCodeSettingsJSON = parse(rVSCodeSettings.content);
                        if (rVSCodeSettingsJSON)
                        {
                            const patterns: string[] = rVSCodeSettingsJSON[SETTING_EXCLUDED_EXTENSIONS] || [];
                            lSetting.content = JSON.stringify(this._getExcludedExtensions(lSettingJSON, patterns));
                            rSetting.content = JSON.stringify(this._getExcludedExtensions(rSettingJSON, patterns));
                        }
                    }
                }
            }
        }
        return { localSettings, remoteSettings };
    }

    /**
     * get excluded extensions based on the excluded setting of remote settings.
     */
    private _getExcludedExtensions(extensions: IExtension[], patterns: string[])
    {
        return extensions.filter((ext) =>
        {
            return !patterns.some((pattern) => minimatch(ext.id, pattern));
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
        let parsed: any;
        let content: string;
        const result = {};
        for (const setting of settings)
        {
            content = setting.content || "";
            parsed = parse(content);

            // Only compare extension's id and version.
            if (setting.type === SettingTypes.Extensions && Array.isArray(parsed))
            {
                for (const ext of parsed)
                {
                    delete ext["uuid"];
                    delete ext["name"];
                    delete ext["publisher"];
                }
            }

            result[setting.remoteFilename] = parsed || content;
        }
        return result;
    }
}
