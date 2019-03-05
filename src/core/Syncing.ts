import * as fs from "fs-extra";
import * as path from "path";

import { localize } from "../i18n";
import { isEmptyString } from "../utils/lang";
import { openFile } from "../utils/vscodeAPI";
import { Environment } from "./Environment";
import { Gist } from "./Gist";
import * as Toast from "./Toast";

/**
 * Represents the `Syncing Settings`.
 */
interface ISyncingSettings
{
    /**
     * Store the GitHub Gist ID.
     */
    id: string;

    /**
     * Store the GitHub Personal Access Token.
     */
    token: string;

    /**
     * Store the http proxy setting.
     */
    http_proxy?: string;
}

/**
 * `Syncing` wrapper.
 */
export class Syncing
{
    private static _instance: Syncing;

    /**
     * The default settings of `Syncing`.
     */
    private static readonly DEFAULT_SETTINGS: ISyncingSettings = { id: "", token: "", http_proxy: "" };

    private _env: Environment;
    private _settingsPath: string;

    private constructor()
    {
        this._env = Environment.create();
        this._settingsPath = path.join(this._env.codeUserDirectory, "syncing.json");
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
     * Gets the proxy setting from `Syncing`'s `http_proxy` setting.
     *
     * If the proxy setting is not set, it will read from the `http_proxy` and `https_proxy` environment variables.
     */
    public get proxy(): string | undefined
    {
        let proxy = this.loadSettings().http_proxy;
        if (proxy == null || isEmptyString(proxy))
        {
            proxy = process.env["http_proxy"] || process.env["https_proxy"];
        }
        return proxy;
    }

    /**
     * Init the `Syncing`'s settings file.
     */
    public initSettings(): Promise<void>
    {
        return this.saveSettings(Syncing.DEFAULT_SETTINGS);
    }

    /**
     * Clears the GitHub Personal Access Token and save to `Syncing`'s settings file.
     */
    public clearGitHubToken(): Promise<void>
    {
        const settings: ISyncingSettings = this.loadSettings();
        settings.token = "";
        return this.saveSettings(settings);
    }

    /**
     * Clears the Gist ID and save to `Syncing`'s settings file.
     */
    public clearGistID(): Promise<void>
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
    public prepareUploadSettings(showIndicator: boolean = false): Promise<ISyncingSettings>
    {
        // GitHub Token must exist, but Gist ID could be none.
        return this.prepareSettings(true, showIndicator);
    }

    /**
     * Prepares the `Syncing`'s settings for downloading.
     *
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    public prepareDownloadSettings(showIndicator: boolean = false): Promise<ISyncingSettings>
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
    public async prepareSettings(forUpload: boolean = true, showIndicator: boolean = false): Promise<ISyncingSettings>
    {
        if (showIndicator)
        {
            Toast.showSpinner(localize("toast.syncing.checking.settings"));
        }

        try
        {
            const settings: ISyncingSettings = this.loadSettings();
            if (!settings.token)
            {
                settings.token = await Toast.showGitHubTokenInputBox(forUpload);
            }

            if (!settings.id)
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
        catch (error)
        {
            if (showIndicator)
            {
                Toast.statusError(forUpload
                    ? localize("toast.settings.uploading.canceled", error.message)
                    : localize("toast.settings.downloading.canceled", error.message)
                );
            }
            throw error;
        }
    }

    /**
     * Loads the `Syncing`'s settings from the settings file (`syncing.json`).
     */
    public loadSettings(): ISyncingSettings
    {
        const settings: ISyncingSettings = { ...Syncing.DEFAULT_SETTINGS };
        try
        {
            return {
                ...settings,
                ...fs.readJsonSync(this.settingsPath, { encoding: "utf8" })
            };
        }
        catch (err)
        {
            console.error(localize("error.loading.syncing.settings"), err);
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
    public async saveSettings(settings: ISyncingSettings, showToast: boolean = false): Promise<void>
    {
        const content = JSON.stringify(settings, null, 4) || Syncing.DEFAULT_SETTINGS;
        try
        {
            await fs.outputFile(this.settingsPath, content);
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
    private async _requestGistID(token: string, forUpload: boolean = true): Promise<string>
    {
        if (token != null && !isEmptyString(token))
        {
            const api: Gist = Gist.create(token, this.proxy);
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
