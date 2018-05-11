import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";

import { openFile } from "../utils/vscodeHelper";
import Environment from "./Environment";
import Gist from "./Gist";
import * as Toast from "./Toast";

/**
 * Represent the settings of `Syncing`.
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
 * `Syncing` wrapper.
 */
export default class Syncing
{
    private static _instance: Syncing;

    /**
     * Default settings of `Syncing`.
     */
    private static readonly DEFAULT_SETTINGS: ISyncingSettings = { id: "", token: "", http_proxy: "" };

    private _env: Environment;
    private _settingsPath: string;

    private constructor(context: vscode.ExtensionContext)
    {
        this._env = Environment.create(context);
        this._settingsPath = path.join(this._env.codeUserPath, "syncing.json");
    }

    /**
     * Create an instance of singleton class `Syncing`.
     */
    public static create(context: vscode.ExtensionContext): Syncing
    {
        if (!Syncing._instance)
        {
            Syncing._instance = new Syncing(context);
        }
        return Syncing._instance;
    }

    /**
     * Get settings file path of `Syncing`.
     */
    public get settingsPath(): string
    {
        return this._settingsPath;
    }

    /**
     * Get proxy settings of Syncing, picked from `Syncing`'s `http_proxy` setting. If not set, picked from `http_proxy` and `https_proxy` environment variables.
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
     * Init settings file of `Syncing`.
     */
    initSettings(): Promise<void>
    {
        return this.saveSettings(Syncing.DEFAULT_SETTINGS);
    }

    /**
     * Migrate settings file of `Syncing`(upgrade to `Syncing` v1.5.0).
     */
    migrateSettings(): Promise<void>
    {
        return this.saveSettings(this.loadSettings());
    }

    /**
     * Clear GitHub Personal Access Token and save to file.
     */
    clearGitHubToken(): Promise<void>
    {
        const settings: ISyncingSettings = this.loadSettings();
        settings.token = "";
        return this.saveSettings(settings);
    }

    /**
     * Clear Gist ID and save to file.
     */
    clearGistID(): Promise<void>
    {
        const settings: ISyncingSettings = this.loadSettings();
        settings.id = "";
        return this.saveSettings(settings);
    }

    /**
     * Prepare `Syncing`'s settings for uploading.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    prepareUploadSettings(showIndicator: boolean = false): Promise<ISyncingSettings>
    {
        // GitHub Token must exist, but Gist ID could be none.
        return this.prepareSettings(true, showIndicator);
    }

    /**
     * Prepare `Syncing`'s settings for downloading.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    prepareDownloadSettings(showIndicator: boolean = false): Promise<ISyncingSettings>
    {
        // GitHub Token could be none, but Gist ID must exist.
        return this.prepareSettings(false, showIndicator);
    }

    /**
     * Prepare `Syncing`'s settings, will ask for settings if not exist.
     * @param forUpload Whether to show messages for upload. Defaults to `true`.
     * @param showIndicator Whether to show the progress indicator. Defaults to `false`.
     */
    prepareSettings(forUpload: boolean = true, showIndicator: boolean = false): Promise<ISyncingSettings>
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
     * Load Syncing's settings (load from settings file: `syncing.json`).
     */
    loadSettings(): ISyncingSettings
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
            console.error(`Syncing: Error loading Syncing's settings: ${err}`);
        }
        return settings;
    }

    /**
     * Save Syncing's settings to file: `syncing.json`.
     * @param settings Syncing's Settings.
     * @param showToast Whether to show error toast. Defaults to `false`.
     */
    saveSettings(settings: ISyncingSettings, showToast: boolean = false): Promise<void>
    {
        return new Promise((resolve) =>
        {
            const content = JSON.stringify(settings, null, 4) || Syncing.DEFAULT_SETTINGS;
            fs.writeFile(this.settingsPath, content, (err) =>
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
     * Open Syncing's settings file (`syncing.json`) in the VSCode editor.
     */
    openSettings()
    {
        fs.pathExists(this.settingsPath).then((exists) =>
        {
            if (exists)
            {
                // Upgrade settings file for `Syncing` v1.5.0.
                this.migrateSettings().then(() =>
                {
                    openFile(this.settingsPath);
                });
            }
            else
            {
                this.initSettings().then(() =>
                {
                    openFile(this.settingsPath);
                });
            }
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
