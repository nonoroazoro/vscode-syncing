import * as fs from "fs-extra";
import { not } from "junk";
import * as micromatch from "micromatch";
import * as path from "node:path";

import {
    CONFIGURATION_EXCLUDED_EXTENSIONS,
    CONFIGURATION_EXCLUDED_SETTINGS,
    CONFIGURATION_KEY,
    CONFIGURATION_POKA_YOKE_THRESHOLD,
    CONFIGURATION_SEPARATE_KEYBINDINGS,
    SETTING_EXCLUDED_EXTENSIONS,
    SETTING_EXCLUDED_SETTINGS,
    VSCODE_SETTINGS_LIST
} from "../constants";
import { localize } from "../i18n";
import { SettingType } from "../types";
import type { IExtension, IGist, IGistFile, ISetting, ISyncedItem } from "../types";
import { diff } from "../utils/diffPatch";
import { readLastModified, writeLastModified } from "../utils/file";
import { excludeSettings, mergeSettings, parse } from "../utils/jsonc";
import { getVSCodeSetting } from "../utils/vscodeAPI";
import { Environment } from "./Environment";
import { Extension } from "./Extension";
import * as Toast from "./Toast";

/**
 * `VSCode Settings` wrapper.
 */
export class VSCodeSetting
{
    private static _instance: VSCodeSetting;

    /**
     * Suffix of remote mac files.
     */
    private static readonly _MAC_SUFFIX: string = "-mac";

    /**
     * Prefix of remote snippet files.
     */
    private static readonly _SNIPPET_PREFIX: string = "snippet-";

    private _env: Environment;
    private _ext: Extension;

    private constructor()
    {
        this._env = Environment.create();
        this._ext = Extension.create();
    }

    /**
     * Creates an instance of singleton class `VSCodeSetting`.
     */
    public static create(): VSCodeSetting
    {
        if (!VSCodeSetting._instance)
        {
            VSCodeSetting._instance = new VSCodeSetting();
        }
        return VSCodeSetting._instance;
    }

    /**
     * Gets `VSCode Settings` (which will be uploaded or downloaded, anyway).
     *
     * For example:
     ```
     [
         {
             name: "settings",
             path: "/Users/Library/Application Support/Code/User/settings.json",
             remote: "settings.json",
             ...
         },
         ...
     ]
     ```
     *
     * @param {boolean} [loadFileContent=false] Whether to load the content of `VSCode Settings` files.
     * Defaults to `false`.
     * @param {boolean} [showIndicator=false] Whether to show the progress indicator. Defaults to `false`.
     * @param {SettingType[]} [settingsList=VSCODE_SETTINGS_LIST] Specifies the settings to get.
     */
    public async getSettings(
        loadFileContent = false,
        showIndicator = false,
        settingsList: SettingType[] = VSCODE_SETTINGS_LIST
    ): Promise<ISetting[]>
    {
        if (showIndicator)
        {
            Toast.showSpinner(localize("toast.settings.gathering.local"));
        }

        let results: ISetting[] = [];
        let localFilename: string;
        let remoteFilename: string;
        let tempSettings: ISetting[];

        for (const settingType of settingsList)
        {
            if (settingType === SettingType.Snippets)
            {
                // Attention: Snippets may be empty.
                tempSettings = await this._getSnippets(this._env.snippetsDirectory);
            }
            else
            {
                localFilename = `${settingType}.json`;
                remoteFilename = localFilename;
                if (settingType === SettingType.Keybindings)
                {
                    // Separate the keybindings.
                    const separateKeybindings = getVSCodeSetting<boolean>(
                        CONFIGURATION_KEY,
                        CONFIGURATION_SEPARATE_KEYBINDINGS
                    );
                    if (separateKeybindings && this._env.isMac)
                    {
                        remoteFilename = `${settingType}${VSCodeSetting._MAC_SUFFIX}.json`;
                    }
                }

                tempSettings = [
                    {
                        localFilePath: this._env.getSettingsFilePath(localFilename),
                        remoteFilename,
                        type: settingType
                    }
                ];
            }
            results.push(...tempSettings);
        }

        if (loadFileContent)
        {
            const contents = await this._loadContent(results);

            const errorFiles: string[] = [];
            results = [];
            contents.forEach((value: ISetting) =>
            {
                // Success if the content is not `null`.
                if (value.content != null)
                {
                    results.push(value);
                }
                else
                {
                    errorFiles.push(value.localFilePath);
                }
            });

            if (errorFiles.length > 0)
            {
                console.error(localize("error.invalid.settings", errorFiles.join("\r\n")));
            }
        }

        if (showIndicator)
        {
            Toast.clearSpinner("");
        }
        return results;
    }

    /**
     * Gets the last modified time (in milliseconds) of VSCode settings.
     *
     * @param {ISetting[]} vscodeSettings VSCode settings.
     */
    public getLastModified(vscodeSettings: ISetting[]): number
    {
        return Math.max.apply(
            null,
            vscodeSettings
                .filter(s => s.lastModified != null)
                .map(s => s.lastModified)
        );
    }

    /**
     * Save `VSCode Settings` to files.
     *
     * @param gist `VSCode Settings` from GitHub Gist.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    public async saveSettings(gist: IGist, showIndicator = false): Promise<{
        updated: ISyncedItem[];
        removed: ISyncedItem[];
    }>
    {
        if (showIndicator)
        {
            Toast.showSpinner(localize("toast.settings.downloading"));
        }

        try
        {
            const { files, updated_at: lastModified } = gist;
            if (files)
            {
                const existsFileKeys: string[] = [];
                const settingsToRemove: ISetting[] = [];
                const settingsToSave: ISetting[] = [];
                let extensionsSetting: ISetting | undefined;
                let gistFile: IGistFile | undefined;

                const settings = await this.getSettings();
                for (const setting of settings)
                {
                    gistFile = files[setting.remoteFilename];
                    if (gistFile)
                    {
                        // If the file exists in both remote and local, it should be synchronized.
                        if (setting.type === SettingType.Extensions)
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
                        // File exists in local but not remote.
                        // Delete if it's a snippet file.
                        if (setting.type === SettingType.Snippets)
                        {
                            settingsToRemove.push(setting);
                        }
                    }
                }

                let filename: string;
                for (const key of Object.keys(files))
                {
                    if (!existsFileKeys.includes(key))
                    {
                        gistFile = files[key];
                        if (gistFile?.filename.startsWith(VSCodeSetting._SNIPPET_PREFIX))
                        {
                            // Snippets.
                            filename = gistFile.filename.slice(VSCodeSetting._SNIPPET_PREFIX.length);
                            if (filename)
                            {
                                settingsToSave.push({
                                    content: gistFile.content,
                                    localFilePath: this._env.getSnippetFilePath(filename),
                                    remoteFilename: gistFile.filename,
                                    type: SettingType.Snippets
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

                // poka-yoke - Determines whether there're too much changes since the last downloading.
                const value = await this._shouldContinue(settings, settingsToSave, settingsToRemove);
                if (value)
                {
                    const syncedItems: {
                        updated: ISyncedItem[];
                        removed: ISyncedItem[];
                    } = { updated: [], removed: [] };

                    // Save settings.
                    for (const setting of settingsToSave)
                    {
                        try
                        {
                            const saved = await this._saveSetting(setting, lastModified);
                            syncedItems.updated.push(saved);
                        }
                        catch (err)
                        {
                            throw new Error(localize("error.save.file", setting.remoteFilename, err.message));
                        }
                    }

                    // Remove settings.
                    const removed = await this.removeSettings(settingsToRemove);
                    syncedItems.removed = removed;

                    if (showIndicator)
                    {
                        Toast.clearSpinner("");
                    }
                    return syncedItems;
                }
                else
                {
                    throw new Error(localize("error.abort.synchronization"));
                }
            }
            else
            {
                throw new Error(localize("error.gist.files.notfound"));
            }
        }
        catch (err)
        {
            if (showIndicator)
            {
                Toast.statusError(localize("toast.settings.downloading.failed", err.message));
            }
            throw err;
        }
    }

    /**
     * Synchronizes the last modified time of the `VSCodeSetting`.
     *
     * @param {ISetting} setting The `VSCodeSetting`.
     * @param {(Date | number | string)} lastModified The last modified time.
     */
    public async saveLastModifiedTime(setting: ISetting, lastModified: Date | number | string)
    {
        if (setting.type === SettingType.Extensions)
        {
            await writeLastModified(this._env.extensionsDirectory, lastModified);
        }
        else
        {
            await writeLastModified(setting.localFilePath, lastModified);
        }
    }

    /**
     * Deletes the physical files corresponding to the `VSCode Settings`.
     *
     * @param settings `VSCode Settings`.
     */
    public async removeSettings(settings: ISetting[]): Promise<ISyncedItem[]>
    {
        const removed: ISyncedItem[] = [];
        for (const setting of settings)
        {
            try
            {
                await fs.remove(setting.localFilePath);
                removed.push({ setting });
            }
            catch (err)
            {
                throw new Error(localize("error.remove.file", setting.remoteFilename, err.message));
            }
        }
        return removed;
    }

    /**
     * Gets all local snippet files.
     *
     * @param snippetsDir Snippets dir.
     */
    private async _getSnippets(snippetsDir: string): Promise<ISetting[]>
    {
        const results: ISetting[] = [];
        try
        {
            const filenames = await fs.readdir(snippetsDir);
            filenames.filter(not).forEach(filename =>
            {
                // Add prefix to all snippets.
                results.push({
                    localFilePath: path.join(snippetsDir, filename),
                    remoteFilename: `${VSCodeSetting._SNIPPET_PREFIX}${filename}`,
                    type: SettingType.Snippets
                });
            });
        }
        catch
        {
            console.error(localize("error.loading.snippets"));
        }
        return results;
    }

    /**
     * Load the content of `VSCode Settings` files. The `content` will exactly be `undefined` when failure happens.
     *
     * @param settings `VSCode Settings`.
     * @param exclude Default is `true`, exclude some `VSCode Settings` base on the exclude list of `Syncing`.
     */
    private async _loadContent(settings: ISetting[], exclude = true): Promise<ISetting[]>
    {
        const result: ISetting[] = [];
        for (const setting of settings)
        {
            let content: string | undefined;
            let lastModified: number | undefined;
            try
            {
                if (setting.type === SettingType.Extensions)
                {
                    // Exclude extensions.
                    let extensions = this._ext.getAll();
                    if (exclude && extensions.length > 0)
                    {
                        const patterns = getVSCodeSetting<string[]>(
                            CONFIGURATION_KEY,
                            CONFIGURATION_EXCLUDED_EXTENSIONS
                        );
                        extensions = this._getExcludedExtensions(extensions, patterns);
                    }
                    content = JSON.stringify(extensions, null, 4);

                    lastModified = await readLastModified(this._env.extensionsDirectory);
                }
                else
                {
                    content = await fs.readFile(setting.localFilePath, "utf8");

                    // Exclude settings.
                    if (exclude && content && setting.type === SettingType.Settings)
                    {
                        const settingsJSON = parse(content);
                        if (settingsJSON)
                        {
                            const patterns = getVSCodeSetting<string[]>(
                                CONFIGURATION_KEY,
                                CONFIGURATION_EXCLUDED_SETTINGS
                            );
                            content = excludeSettings(content, settingsJSON, patterns);
                        }
                    }

                    lastModified = await readLastModified(setting.localFilePath);
                }
            }
            catch (err)
            {
                content = undefined;
                console.error(localize("error.loading.settings", setting.remoteFilename, err));
            }
            result.push({ ...setting, content, lastModified });
        }
        return result;
    }

    /**
     * Save `VSCode Setting` to file or sync extensions.
     *
     * @param setting `VSCode Setting`.
     */
    private async _saveSetting(setting: ISetting, lastModified: string): Promise<ISyncedItem>
    {
        let result: ISyncedItem;
        if (setting.type === SettingType.Extensions)
        {
            // Sync extensions.
            const extensions = parse(setting.content ?? "[]") as IExtension[];
            result = await this._ext.sync(extensions, true);
        }
        else
        {
            let settingsToSave = setting.content;
            if (setting.type === SettingType.Settings && settingsToSave)
            {
                // Sync settings.
                const localFiles = await this._loadContent([setting], false);
                const localSettings = localFiles[0]?.content;
                if (localSettings)
                {
                    // Merge remote and local settings.
                    settingsToSave = mergeSettings(settingsToSave, localSettings);
                }
            }

            // Save to disk.
            result = await this._saveToFile({ ...setting, content: settingsToSave });
        }

        // Synchronize last modified time.
        await this.saveLastModifiedTime(setting, lastModified);

        return result;
    }

    /**
     * Save the `VSCode Setting` to disk.
     */
    private async _saveToFile(setting: ISetting)
    {
        return fs.outputFile(setting.localFilePath, setting.content ?? "{}").then(() => ({ setting } as ISyncedItem));
    }

    /**
     * Determines whether the downloading should continue.
     */
    private async _shouldContinue(
        settings: ISetting[],
        settingsToSave: ISetting[],
        settingsToRemove: ISetting[]
    ): Promise<boolean>
    {
        let result = true;
        const threshold = getVSCodeSetting<number>(CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD);
        if (threshold > 0)
        {
            const localSettings = await this._loadContent(settings, false);

            // poka-yoke - Determines whether there're too much changes since the last uploading.
            // 1. Excluded settings.
            // Here clone the settings to avoid manipulation.
            let excludedSettings = this._excludeSettings(
                localSettings,
                settingsToSave.map(setting => ({ ...setting })),
                SettingType.Settings
            );

            // 2. Excluded extensions.
            excludedSettings = this._excludeSettings(
                excludedSettings.localSettings,
                excludedSettings.remoteSettings,
                SettingType.Extensions
            );

            // 3. Diff settings.
            const changes = settingsToRemove.length
                + this._diffSettings(excludedSettings.localSettings, excludedSettings.remoteSettings);
            if (changes >= threshold)
            {
                const okButton = localize("pokaYoke.continue.download");
                const message = localize("pokaYoke.continue.download.message");
                const selection = await Toast.showConfirmBox(message, okButton, localize("pokaYoke.cancel"));
                result = selection === okButton;
            }
        }
        return result;
    }

    /**
     * Excludes settings based on the excluded setting of remote settings.
     */
    private _excludeSettings(localSettings: ISetting[], remoteSettings: ISetting[], type: SettingType)
    {
        const lSetting = localSettings.find(setting => (setting.type === type));
        const rSetting = remoteSettings.find(setting => (setting.type === type));
        if (lSetting?.content && rSetting?.content)
        {
            const lSettingJSON = parse(lSetting.content) as JSONObject;
            const rSettingJSON = parse(rSetting.content) as JSONObject;
            if (lSettingJSON && rSettingJSON)
            {
                if (type === SettingType.Settings)
                {
                    // Exclude settings.
                    const patterns = (rSettingJSON[SETTING_EXCLUDED_SETTINGS] ?? []) as string[];
                    lSetting.content = excludeSettings(lSetting.content, lSettingJSON, patterns);
                    rSetting.content = excludeSettings(rSetting.content, rSettingJSON, patterns);
                }
                else if (type === SettingType.Extensions)
                {
                    // Exclude extensions.
                    const rVSCodeSettings = remoteSettings.find(setting => (setting.type === SettingType.Settings));
                    if (rVSCodeSettings?.content)
                    {
                        const rVSCodeSettingsJSON = parse(rVSCodeSettings.content) as JSONObject;
                        if (rVSCodeSettingsJSON)
                        {
                            const patterns = (rVSCodeSettingsJSON[SETTING_EXCLUDED_EXTENSIONS] ?? []) as string[];
                            lSetting.content = JSON.stringify(
                                this._getExcludedExtensions(lSettingJSON as unknown as IExtension[], patterns)
                            );
                            rSetting.content = JSON.stringify(
                                this._getExcludedExtensions(rSettingJSON as unknown as IExtension[], patterns)
                            );
                        }
                    }
                }
            }
        }
        return { localSettings, remoteSettings };
    }

    /**
     * Gets excluded extensions based on the excluded setting of remote settings.
     */
    private _getExcludedExtensions(extensions: IExtension[], patterns: string[])
    {
        return extensions.filter(ext => !patterns.some(pattern => micromatch.isMatch(ext.id, pattern)));
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
    private _parseToJSON(settings: ISetting[]): Record<string, unknown>
    {
        let parsed: unknown;
        let content: string;
        const result: Record<string, unknown> = {};
        for (const setting of settings)
        {
            content = setting.content ?? "";
            parsed = parse(content);

            if (setting.type === SettingType.Extensions && Array.isArray(parsed))
            {
                for (const ext of parsed)
                {
                    if (ext["id"] != null)
                    {
                        ext["id"] = (ext["id"] as string).toLocaleLowerCase();
                    }

                    // Only compares id and version.
                    delete ext["name"];
                    delete ext["publisher"];
                    delete ext["uuid"];
                }
            }

            result[setting.remoteFilename] = parsed ?? content;
        }
        return result;
    }
}
