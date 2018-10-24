import * as fs from "fs-extra";
import * as path from "path";

import { localize } from "../i18n";
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
        if (!proxy)
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
    public prepareSettings(forUpload: boolean = true, showIndicator: boolean = false): Promise<ISyncingSettings>
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
                    Toast.statusError(forUpload
                        ? localize("toast.settings.uploading.canceled", error.message)
                        : localize("toast.settings.downloading.canceled", error.message)
                    );
                }
                reject(error);
            }

            if (showIndicator)
            {
                Toast.showSpinner(localize("toast.settings.checking.syncing"));
            }

            const settings: ISyncingSettings = this.loadSettings();
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
                    this.saveSettings(settings, true).then(() => resolveWrap(settings));
                }).catch(rejectWrap);
            }
        });
    }

    /**
     * Loads the `Syncing`'s settings from the settings file (`syncing.json`).
     */
    public loadSettings(): ISyncingSettings
    {
        const settings: ISyncingSettings = { ...Syncing.DEFAULT_SETTINGS };
        try
        {
            Object.assign(
                settings,
                fs.readJsonSync(this.settingsPath, { encoding: "utf8" })
            );
        }
        catch (err)
        {
            console.error(localize("error.load.syncing.settings"), err);
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
    public saveSettings(settings: ISyncingSettings, showToast: boolean = false): Promise<void>
    {
        return new Promise((resolve) =>
        {
            const content = JSON.stringify(settings, null, 4) || Syncing.DEFAULT_SETTINGS;
            fs.outputFile(this.settingsPath, content, (err) =>
            {
                if (err && showToast)
                {
                    Toast.statusError(localize("toast.settings.save.syncing", err));
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
    private _requestGistID(token: string, forUpload: boolean = true): Promise<{ id: string }>
    {
        if (token)
        {
            const api: Gist = Gist.create(token, this.proxy);
            return Toast.showRemoteGistListBox(api, forUpload).then((value) =>
            {
                if (value.id === "")
                {
                    // Show gist input box when id is still null.
                    return Toast.showGistInputBox(forUpload);
                }
                return value;
            });
        }
        return Toast.showGistInputBox(forUpload);
    }
}
