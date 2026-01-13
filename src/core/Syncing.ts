import * as fs from "fs-extra";

import { localize } from "../i18n";
import type { ISyncingSettings } from "../types";
import { isEmptyString } from "../utils/lang";
import { openFile } from "../utils/vscodeAPI";
import { Environment } from "./Environment";
import { Gist } from "./Gist";
import { Logger } from "./Logger";
import * as Toast from "./Toast";

/**
 * `Syncing` wrapper.
 */
export class Syncing
{
    private static _instance: Syncing;

    /**
     * The default settings of `Syncing`.
     */
    private static readonly _DEFAULT_SETTINGS: ISyncingSettings = {
        id: "",
        token: "",
        auto_sync: false
    };

    private _settingsPath: string;

    private constructor()
    {
        this._settingsPath = Environment.instance.getSettingsFilePath("syncing.json");
    }

    /**
     * Creates an instance of singleton class `Syncing`.
     */
    public static create(): Syncing
    {
        if (!Syncing._instance)
        {
            Syncing._instance = new Syncing();
        }
        return Syncing._instance;
    }

    /**
     * Gets the full path of `Syncing`'s `settings file`.
     */
    public get settingsPath(): string
    {
        return this._settingsPath;
    }

    /**
     * Gets the auto-sync setting of `Syncing`.
     *
     * @default false
     */
    public get autoSync(): boolean
    {
        return this.loadSettings().auto_sync;
    }

    /**
     * Init the `Syncing`'s settings file.
     */
    public async initSettings(): Promise<void>
    {
        return this.saveSettings(Syncing._DEFAULT_SETTINGS);
    }

    /**
     * Clears the GitHub Personal Access Token and save to `Syncing`'s settings file.
     */
    public async clearGitHubToken(): Promise<void>
    {
        const settings: ISyncingSettings = this.loadSettings();
        settings.token = "";
        return this.saveSettings(settings);
    }

    /**
     * Clears the Gist ID and save to `Syncing`'s settings file.
     */
    public async clearGistID(): Promise<void>
    {
        const settings: ISyncingSettings = this.loadSettings();
        settings.id = "";
        return this.saveSettings(settings);
    }

    /**
     * Prepares the `Syncing`'s settings for uploading.
     *
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    public async prepareUploadSettings(showIndicator = false): Promise<ISyncingSettings>
    {
        // GitHub Token must exist, but Gist ID could be none.
        return this.prepareSettings(true, showIndicator);
    }

    /**
     * Prepares the `Syncing`'s settings for downloading.
     *
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    public async prepareDownloadSettings(showIndicator = false): Promise<ISyncingSettings>
    {
        // GitHub Token could be none, but Gist ID must exist.
        return this.prepareSettings(false, showIndicator);
    }

    /**
     * Prepare `Syncing`'s settings, will ask for settings if the settings are not existed.
     *
     * @param forUpload Whether to show messages for upload. Defaults to `true`.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    public async prepareSettings(forUpload = true, showIndicator = false): Promise<ISyncingSettings>
    {
        if (showIndicator)
        {
            Toast.showSpinner(localize("toast.syncing.checking.settings"));
        }

        try
        {
            const settings: ISyncingSettings = this.loadSettings();
            const isTokenEmpty = settings.token == null || isEmptyString(settings.token);
            const isIDEmpty = settings.id == null || isEmptyString(settings.id);
            // Ask for token when:
            // 1. uploading with an empty token
            // 2. downloading with an empty token and an empty Gist ID.
            if (isTokenEmpty && (forUpload || isIDEmpty))
            {
                settings.token = await Toast.showGitHubTokenInputBox(forUpload);
            }
            if (isIDEmpty)
            {
                settings.id = await this._requestGistID(settings.token, forUpload);
            }

            await this.saveSettings(settings, true);

            if (showIndicator)
            {
                Toast.clearSpinner("");
            }
            return settings;
        }
        catch (err)
        {
            if (showIndicator)
            {
                Toast.statusError(
                    forUpload
                        ? localize("toast.settings.uploading.canceled", err.message)
                        : localize("toast.settings.downloading.canceled", err.message)
                );
            }
            throw err;
        }
    }

    /**
     * Loads the `Syncing`'s settings from the settings file (`syncing.json`).
     */
    public loadSettings(): ISyncingSettings
    {
        let settings: ISyncingSettings = { ...Syncing._DEFAULT_SETTINGS };
        try
        {
            settings = {
                ...settings,
                ...fs.readJsonSync(this.settingsPath, { encoding: "utf8" })
            };
        }
        catch (err)
        {
            Logger.instance.error(localize("error.loading.syncing.settings"), err);
        }
        return settings;
    }

    /**
     * Open `Syncing`'s settings file in a VSCode editor.
     */
    public async openSettings()
    {
        const exists = await fs.pathExists(this.settingsPath);
        if (!exists)
        {
            await this.initSettings();
        }
        openFile(this.settingsPath);
    }

    /**
     * Save `Syncing`'s settings to disk.
     *
     * @param settings Syncing's Settings.
     * @param showToast Whether to show error toast. Defaults to `false`.
     */
    public async saveSettings(settings: ISyncingSettings, showToast = false): Promise<void>
    {
        try
        {
            await fs.outputFile(
                this.settingsPath,
                JSON.stringify(settings, null, 4)
            );
        }
        catch (err)
        {
            if (showToast)
            {
                Toast.statusError(localize("toast.syncing.save.settings", err));
            }
        }
    }

    /**
     * Ask user for Gist ID.
     *
     * @param token GitHub Personal Access Token.
     * @param forUpload Whether to show messages for upload. Defaults to `true`.
     */
    private async _requestGistID(token: string, forUpload = true): Promise<string>
    {
        if (token != null && !isEmptyString(token))
        {
            const api: Gist = Gist.create(token);
            const id = await Toast.showRemoteGistListBox(api, forUpload);
            if (isEmptyString(id))
            {
                // Show gist input box when id is still not supplied.
                return Toast.showGistInputBox(forUpload);
            }
            return id;
        }
        return Toast.showGistInputBox(forUpload);
    }
}
