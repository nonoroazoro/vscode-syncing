import * as Github from "@octokit/rest";
import * as HttpsProxyAgent from "https-proxy-agent";
import pick = require("lodash.pick");
import * as vscode from "vscode";

import { CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD, SETTINGS_UPLOAD_EXCLUDE } from "../common/constants";
import * as GitHubTypes from "../common/GitHubTypes";
import { ISetting, SettingTypes } from "../common/types";
import { diff } from "../utils/diffPatch";
import { excludeSettings, parse } from "../utils/jsonc";
import * as Toast from "./Toast";

/**
 * GitHub Gist utils.
 */
export default class Gist
{
    private static _instance: Gist;

    /**
     * Description of Gists.
     */
    private static readonly GIST_DESCRIPTION: string = "VSCode's Settings - Syncing";

    private _api: Github;
    private _proxy?: string;
    private _token?: string;

    private constructor(token?: string, proxy?: string)
    {
        this._proxy = proxy;
        this._api = new Github(Object.assign({ timeout: 8000 }, proxy ? { agent: new HttpsProxyAgent(proxy) } : {}));
        this._token = token;
        if (token)
        {
            this._api.authenticate({
                token,
                type: "oauth"
            });
        }
    }

    /**
     * Create an instance of class `Gist`, only create new when params are changed.
     * @param token GitHub Personal Access Token.
     * @param proxy Proxy url.
     */
    public static create(token?: string, proxy?: string): Gist
    {
        if (!Gist._instance || Gist._instance.token !== token || Gist._instance.proxy !== proxy)
        {
            Gist._instance = new Gist(token, proxy);
        }
        return Gist._instance;
    }

    /**
     * Get GitHub Personal Access Token.
     */
    public get token()
    {
        return this._token;
    }

    /**
     * Get proxy url.
     */
    public get proxy()
    {
        return this._proxy;
    }

    /**
     * Get the currently authenticated GitHub user.
     */
    public user(): Promise<{ name: string, id: number } | null>
    {
        return new Promise((resolve) =>
        {
            this._api.users
                .get({})
                .then(({ data }: { data: GitHubTypes.IGistOwner }) =>
                {
                    resolve({ name: data.login, id: data.id });
                })
                .catch(() =>
                {
                    resolve();
                });
        });
    }

    /**
     * Get gist of the authenticated user.
     * @param id Gist id.
     * @param showIndicator Defaults to `false`, don't show progress indicator.
     */
    public get(id: string, showIndicator: boolean = false): Promise<GitHubTypes.IGist>
    {
        return new Promise((resolve, reject) =>
        {
            function resolveWrap(value: Github.AnyResponse)
            {
                if (showIndicator)
                {
                    Toast.clearSpinner("");
                }
                resolve(value.data);
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
                Toast.showSpinner("Syncing: Checking remote settings.");
            }

            // TODO: Remove "as any" after the @octokit/rest is updated.
            this._api.gists.get({ gist_id: id } as any).then(resolveWrap).catch(({ code }) =>
            {
                rejectWrap(this._createError(code));
            });
        });
    }

    /**
     * Get all gists of the authenticated user.
     */
    public getAll(): Promise<GitHubTypes.IGist[]>
    {
        return new Promise((resolve, reject) =>
        {
            this._api.gists.getAll({}).then((res) =>
            {
                // filter out the VSCode settings.
                const gists: GitHubTypes.IGist[] = res.data;
                resolve(gists
                    .filter((gist) => (gist.description === Gist.GIST_DESCRIPTION || gist.files["extensions.json"]))
                    .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
                );
            }).catch(({ code }) =>
            {
                reject(this._createError(code));
            });
        });
    }

    /**
     * Delete gist.
     * @param id Gist id.
     */
    public delete(id: string): Promise<GitHubTypes.IGist>
    {
        // TODO: Remove "as any" after the @octokit/rest is updated.
        return this._api.gists.delete({ gist_id: id } as any).then((res) => res.data);
    }

    /**
     * Update gist.
     * @param content Gist content.
     */
    public update(content: Github.GistsEditParams): Promise<GitHubTypes.IGist>
    {
        return this._api.gists.edit(content).then((res) => res.data);
    }

    /**
     * Check if gist exists of the currently authenticated user.
     * @param id Gist id.
     */
    public exists(id: string): Promise<GitHubTypes.IGist | boolean>
    {
        return new Promise((resolve) =>
        {
            if (id && id.trim() !== "")
            {
                this.get(id)
                    .then((gist) =>
                    {
                        if (this.token)
                        {
                            this.user().then((user) =>
                            {
                                // check if the Gist's owner is the currently authenticated user.
                                if (user && user.id === gist.owner.id)
                                {
                                    resolve(gist);
                                }
                                else
                                {
                                    resolve(false);
                                }
                            });
                        }
                        else
                        {
                            resolve(gist);
                        }
                    })
                    .catch(() => resolve(false));
            }
            else
            {
                resolve(false);
            }
        });
    }

    /**
     * Create gist.
     * @param content Gist content.
     */
    public create(content: Github.GistsCreateParams): Promise<GitHubTypes.IGist>
    {
        return new Promise((resolve, reject) =>
        {
            this._api.gists.create(content).then((res) =>
            {
                resolve(res.data);
            }).catch(({ code }) =>
            {
                reject(this._createError(code));
            });
        });
    }

    /**
     * Create settings gist.
     * @param files Settings files.
     * @param isPublic Defaults to `false`, gist is set to private.
     */
    public createSettings(files = {}, isPublic = false): Promise<GitHubTypes.IGist>
    {
        return this.create({
            description: Gist.GIST_DESCRIPTION,
            files,
            public: isPublic
        });
    }

    /**
     * Find and update gist.
     * @param id Gist id.
     * @param uploads Settings that will be uploaded.
     * @param upsert Default is `true`, create new if gist not exists.
     * @param showIndicator Defaults to `false`, don't show progress indicator.
     */
    public findAndUpdate(id: string, uploads: ISetting[], upsert = true, showIndicator = false): Promise<GitHubTypes.IGist>
    {
        return new Promise((resolve, reject) =>
        {
            function resolveWrap(value: GitHubTypes.IGist)
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
                    Toast.statusError(`Syncing: Uploading failed. ${error.message}`);
                }
                reject(error);
            }

            if (showIndicator)
            {
                Toast.showSpinner("Syncing: Uploading settings.");
            }

            this.exists(id).then((exists) =>
            {
                const localGist: { gist_id: string, files: any } = { gist_id: id, files: {} };
                for (const item of uploads)
                {
                    // `null` content will be filtered out, just in case.
                    if (item.content)
                    {
                        if (item.type === SettingTypes.Settings)
                        {
                            // TODO: Merge settings files into one: Should be removed in the next release.
                            localGist.files["settings.json"] = { content: item.content };
                        }
                        else
                        {
                            localGist.files[item.remoteFilename] = { content: item.content };
                        }
                    }
                }

                if (exists)
                {
                    // only update when files are modified.
                    const remoteGist = exists as GitHubTypes.IGist;
                    localGist.files = this._getModifiedFiles(localGist.files, remoteGist.files);
                    if (localGist.files)
                    {
                        // TODO: Should be removed in the next release.
                        if (remoteGist.files["settings-mac.json"])
                        {
                            localGist.files["settings-mac.json"] = null;
                        }

                        // poka-yoke - check if there have been two much changes (more than 10 changes) since the last uploading.
                        const threshold = vscode.workspace.getConfiguration(CONFIGURATION_KEY).get<number>(CONFIGURATION_POKA_YOKE_THRESHOLD);
                        if (threshold > 0)
                        {
                            const localFiles = { ...localGist.files };
                            const remoteFiles = pick(remoteGist.files, Object.keys(localFiles));

                            // 1. Get the excluded settings.
                            const settingsItem = uploads.find((item) => item.type === SettingTypes.Settings);
                            if (settingsItem)
                            {
                                const settingsName = settingsItem.remoteFilename;
                                const localSettings = localFiles[settingsName];
                                const remoteSettings = remoteFiles[settingsName];
                                if (remoteSettings && remoteSettings.content && localSettings && localSettings.content)
                                {
                                    const localSettingsJSON = parse(localSettings.content);
                                    const patterns = localSettingsJSON[SETTINGS_UPLOAD_EXCLUDE] || [];
                                    localFiles[settingsName] = {
                                        ...localSettings,
                                        content: excludeSettings(localSettings.content, localSettingsJSON, patterns)
                                    };

                                    const remoteSettingsJSON = parse(remoteSettings.content);
                                    remoteFiles[settingsName] = {
                                        ...remoteSettings,
                                        content: excludeSettings(remoteSettings.content, remoteSettingsJSON, patterns)
                                    };
                                }
                            }

                            // 2. Diff settings.
                            const changes = this._diffSettings(localFiles, remoteFiles);
                            if (changes >= threshold)
                            {
                                const okButton = "Continue to upload";
                                const message = "A lot of changes have been made since your last sync. Are you sure to OVERWRITE THE REMOTE SETTINGS?";
                                Toast.showConfirmBox(message, okButton, "Cancel").then((selection) =>
                                {
                                    if (selection === okButton)
                                    {
                                        // TODO: Remove "as any" after the @octokit/rest is updated.
                                        this.update(localGist as any).then(resolveWrap).catch(rejectWrap);
                                    }
                                    else
                                    {
                                        rejectWrap(new Error("You abort the synchronization."));
                                    }
                                });
                            }
                            else
                            {
                                // TODO: Remove "as any" after the @octokit/rest is updated.
                                this.update(localGist as any).then(resolveWrap).catch(rejectWrap);
                            }
                        }
                        else
                        {
                            // TODO: Remove "as any" after the @octokit/rest is updated.
                            this.update(localGist as any).then(resolveWrap).catch(rejectWrap);
                        }
                    }
                    else
                    {
                        resolveWrap(remoteGist);
                    }
                }
                else
                {
                    if (upsert)
                    {
                        // TODO: pass gist public.
                        this.createSettings(localGist.files).then(resolveWrap).catch(rejectWrap);
                    }
                    else
                    {
                        rejectWrap(new Error(`No such ID in Gist: ${id}`));
                    }
                }
            });
        });
    }

    /**
     * Get modified files list.
     * @returns {} or `null`.
     */
    private _getModifiedFiles(localFiles: any, remoteFiles?: GitHubTypes.IGistFiles): any
    {
        if (!remoteFiles)
        {
            return localFiles;
        }

        let localFile;
        let remoteFile;
        const result = {};
        const recordedKeys = [];
        for (const key of Object.keys(remoteFiles))
        {
            localFile = localFiles[key];
            remoteFile = remoteFiles[key];
            if (localFile)
            {
                // ignore null local file.
                if (localFile.content && localFile.content !== remoteFile.content)
                {
                    result[key] = localFile;
                }
            }
            else
            {
                // remove remote file (don't remove remote keybindings and settings).
                if (!key.includes(SettingTypes.Keybindings) && !key.includes(SettingTypes.Settings))
                {
                    result[key] = null;
                }
            }
            recordedKeys.push(key);
        }

        // add rest local files.
        for (const key of Object.keys(localFiles))
        {
            if (recordedKeys.indexOf(key) === -1)
            {
                // ignore null local file.
                localFile = localFiles[key];
                if (localFile.content)
                {
                    result[key] = localFile;
                }
            }
        }

        return (Object.keys(result).length === 0) ? null : result;
    }

    /**
     * Create error from error code.
     */
    private _createError(code: number)
    {
        let message = "Please check your Internet connection or proxy settings.";
        if (code === 401)
        {
            message = "Please check your GitHub Personal Access Token.";
        }
        else if (code === 404)
        {
            message = "Please check your Gist ID.";
        }
        const error = new Error(message);
        Object.assign(error, { code });
        return error;
    }

    /**
     * Calculates the number of differences between the local and remote files.
     */
    private _diffSettings(localFiles: GitHubTypes.IGistFiles, remoteFiles: GitHubTypes.IGistFiles): number
    {
        const left = this._parseToJSON(localFiles);
        const right = this._parseToJSON(pick(remoteFiles, Object.keys(localFiles)));
        return diff(left, right);
    }

    /**
     * Converts the `content` of `GitHubTypes.IGistFiles` into a `JSON object`.
     */
    private _parseToJSON(files: GitHubTypes.IGistFiles): any
    {
        let file: any;
        const result = {};
        for (const key of Object.keys(files))
        {
            file = files[key];
            if (file)
            {
                result[key] = parse(file.content || "");
            }
            else
            {
                result[key] = file;
            }
        }
        return result;
    }
}
