import * as Github from "@octokit/rest";
import * as HttpsProxyAgent from "https-proxy-agent";
import pick = require("lodash.pick");

import { CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD } from "../common/constants";
import { localize } from "../i18n";
import * as GitHubTypes from "../types/GitHubTypes";
import { ISetting, SettingTypes } from "../types/SyncingTypes";
import { diff } from "../utils/diffPatch";
import { parse } from "../utils/jsonc";
import { getVSCodeSetting } from "../utils/vscodeAPI";
import * as Toast from "./Toast";

/**
 * GitHub Gist utils.
 */
export class Gist
{
    private static _instance: Gist;

    /**
     * The description of Syncing's gists.
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
     * Creates an instance of the class `Gist`, only create a new instance if the params are changed.
     *
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
     * Gets the GitHub Personal Access Token.
     */
    public get token()
    {
        return this._token;
    }

    /**
     * Gets the proxy url.
     */
    public get proxy()
    {
        return this._proxy;
    }

    /**
     * Gets the currently authenticated GitHub user.
     */
    public async user(): Promise<{ id: number, name: string } | undefined>
    {
        try
        {
            const res = await this._api.users.get({});
            const data = res.data as GitHubTypes.IGistOwner;
            return {
                id: data.id,
                name: data.login
            };
        }
        catch (err)
        {
            return;
        }
    }

    /**
     * Gets the gist of the currently authenticated user.
     *
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
                    Toast.statusError(localize("toast.settings.downloading.failed", error.message));
                }
                reject(error);
            }

            if (showIndicator)
            {
                Toast.showSpinner(localize("toast.settings.checking.remote"));
            }

            this._api.gists.get({ gist_id: id }).then(resolveWrap).catch(({ code }) =>
            {
                rejectWrap(this._createError(code));
            });
        });
    }

    /**
     * Gets all the gists of the currently authenticated user.
     */
    public getAll(): Promise<GitHubTypes.IGist[]>
    {
        return new Promise((resolve, reject) =>
        {
            this._api.gists.getAll({}).then((res) =>
            {
                // Filter out VSCode settings.
                const gists: GitHubTypes.IGist[] = res.data as any;
                resolve(
                    gists
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
     *
     * @param id Gist id.
     */
    public async delete(id: string): Promise<void>
    {
        await this._api.gists.delete({ gist_id: id });
    }

    /**
     * Update gist.
     *
     * @param content Gist content.
     */
    public update(content: Github.GistsEditParams): Promise<GitHubTypes.IGist>
    {
        return this._api.gists.edit(content).then((res) => res.data as any as GitHubTypes.IGist);
    }

    /**
     * Determines whether the specified gist exists.
     *
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
                                // Determines whether the owner of the gist is the currently authenticated user.
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
     * Creates a new gist.
     *
     * @param content Gist content.
     */
    public create(content: Github.GistsCreateParams): Promise<GitHubTypes.IGist>
    {
        return new Promise((resolve, reject) =>
        {
            this._api.gists.create(content).then((res) =>
            {
                resolve(res.data as any as GitHubTypes.IGist);
            }).catch(({ code }) =>
            {
                reject(this._createError(code));
            });
        });
    }

    /**
     * Creates a new settings gist.
     *
     * @param files Settings files.
     * @param isPublic Defaults to `false`, the gist is set to private.
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
     * Updates the gist.
     *
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
                    Toast.statusError(localize("toast.settings.uploading.failed", error.message));
                }
                reject(error);
            }

            if (showIndicator)
            {
                Toast.showSpinner(localize("toast.settings.uploading"));
            }

            this.exists(id).then((exists) =>
            {
                const localGist: { gist_id: string, files: any } = { gist_id: id, files: {} };
                for (const item of uploads)
                {
                    // `null` content will be filtered out, just in case.
                    if (item.content)
                    {
                        localGist.files[item.remoteFilename] = { content: item.content };
                    }
                }

                if (exists)
                {
                    // Upload if the files are modified.
                    const remoteGist = exists as GitHubTypes.IGist;
                    localGist.files = this._getModifiedFiles(localGist.files, remoteGist.files);
                    if (localGist.files)
                    {
                        // poka-yoke - Determines whether there're too much changes since the last uploading.
                        const threshold = getVSCodeSetting<number>(CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD);
                        if (threshold > 0)
                        {
                            // Note that the local settings here have already been excluded.
                            const localFiles = { ...localGist.files };
                            const remoteFiles = pick(remoteGist.files, Object.keys(localFiles));

                            // Diff settings.
                            const changes = this._diffSettings(localFiles, remoteFiles);
                            if (changes >= threshold)
                            {
                                const okButton = localize("pokaYoke.continue.upload");
                                const message = localize("pokaYoke.continue.upload.message");
                                Toast.showConfirmBox(message, okButton, localize("pokaYoke.cancel")).then((selection) =>
                                {
                                    if (selection === okButton)
                                    {
                                        this.update(localGist).then(resolveWrap).catch(rejectWrap);
                                    }
                                    else
                                    {
                                        rejectWrap(new Error(localize("error.abort.synchronization")));
                                    }
                                });
                            }
                            else
                            {
                                this.update(localGist).then(resolveWrap).catch(rejectWrap);
                            }
                        }
                        else
                        {
                            this.update(localGist).then(resolveWrap).catch(rejectWrap);
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
                        // TODO: Pass gist public option.
                        this.createSettings(localGist.files).then(resolveWrap).catch(rejectWrap);
                    }
                    else
                    {
                        rejectWrap(new Error(localize("error.gist.notfound", id)));
                    }
                }
            });
        });
    }

    /**
     * Gets the modified files list.
     */
    private _getModifiedFiles(localFiles: any, remoteFiles?: GitHubTypes.IGistFiles): object | null
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
                // Ignore null local file.
                if (localFile.content && localFile.content !== remoteFile.content)
                {
                    result[key] = localFile;
                }
            }
            else
            {
                // Remove remote file except keybindings and settings.
                if (!key.includes(SettingTypes.Keybindings) && !key.includes(SettingTypes.Settings))
                {
                    result[key] = null;
                }
            }
            recordedKeys.push(key);
        }

        // Add rest local files.
        for (const key of Object.keys(localFiles))
        {
            if (recordedKeys.indexOf(key) === -1)
            {
                // Ignore null local file.
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
     * Creates the error from an error code.
     */
    private _createError(code: number)
    {
        let message = localize("error.check.internet");
        if (code === 401)
        {
            message = localize("error.check.github.token");
        }
        else if (code === 404)
        {
            message = localize("error.check.gist.id");
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
    private _parseToJSON(files: GitHubTypes.IGistFiles): object
    {
        let file: GitHubTypes.IGistFile;
        let parsed: object;
        const result = {};
        for (const key of Object.keys(files))
        {
            file = files[key];
            if (file)
            {
                parsed = parse(file.content || "");

                if (key === "extensions.json" && Array.isArray(parsed))
                {
                    for (const ext of parsed)
                    {
                        ext["id"] = ext["id"].toLocaleLowerCase();

                        // Only compares id and version.
                        delete ext["name"];
                        delete ext["publisher"];
                        delete ext["uuid"];
                    }
                }

                result[key] = parsed;
            }
            else
            {
                result[key] = file;
            }
        }
        return result;
    }
}
