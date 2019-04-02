import * as Github from "@octokit/rest";
import * as HttpsProxyAgent from "https-proxy-agent";
import pick = require("lodash.pick");

import { CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD } from "../common/constants";
import { localize } from "../i18n";
import * as GitHubTypes from "../types/GitHubTypes";
import { ISetting, SettingTypes } from "../types/SyncingTypes";
import { diff } from "../utils/diffPatch";
import { parse } from "../utils/jsonc";
import { isEmptyString } from "../utils/lang";
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

        const options: Record<string, any> = { request: { timeout: 8000 } };
        if (proxy != null && !isEmptyString(proxy))
        {
            options.request["agent"] = new HttpsProxyAgent(proxy);
        }

        this._token = token;
        if (token != null && !isEmptyString(token))
        {
            options["auth"] = `token ${token}`;
        }

        this._api = new Github(options);
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
    public async user(): Promise<{ id: number, name: string }>
    {
        try
        {
            const res = await this._api.users.getAuthenticated({});
            const data = res.data as GitHubTypes.IGistOwner;
            return {
                id: data.id,
                name: data.login
            };
        }
        catch ({ status })
        {
            throw this._createError(status);
        }
    }

    /**
     * Gets the gist of the currently authenticated user.
     *
     * @param id Gist id.
     * @param showIndicator Defaults to `false`, don't show progress indicator.
     */
    public async get(id: string, showIndicator: boolean = false): Promise<GitHubTypes.IGist>
    {
        if (showIndicator)
        {
            Toast.showSpinner(localize("toast.settings.checking.remote"));
        }

        try
        {
            const result = await this._api.gists.get({ gist_id: id });
            if (showIndicator)
            {
                Toast.clearSpinner("");
            }
            return result.data as any;
        }
        catch ({ status })
        {
            const error = this._createError(status);
            if (showIndicator)
            {
                Toast.statusError(localize("toast.settings.downloading.failed", error.message));
            }
            throw error;
        }
    }

    /**
     * Gets all the gists of the currently authenticated user.
     */
    public async getAll(): Promise<GitHubTypes.IGist[]>
    {
        try
        {
            const res = await this._api.gists.list({});
            // Find and sort VSCode settings gists by time.
            const gists: GitHubTypes.IGist[] = res.data as any;
            const extensionsRemoteFilename = `${SettingTypes.Extensions}.json`;
            return gists
                .filter((gist) => (gist.description === Gist.GIST_DESCRIPTION || gist.files[extensionsRemoteFilename]))
                .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        }
        catch ({ status })
        {
            throw this._createError(status);
        }
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
    public async update(content: Github.GistsUpdateParams): Promise<GitHubTypes.IGist>
    {
        const res = await this._api.gists.update(content);
        return res.data as any;
    }

    /**
     * Determines whether the specified gist exists.
     *
     * @param id Gist id.
     */
    public async exists(id: string): Promise<false | GitHubTypes.IGist>
    {
        if (id != null && !isEmptyString(id))
        {
            try
            {
                const gist = await this.get(id);
                if (this.token)
                {
                    const user = await this.user();
                    // Determines whether the owner of the gist is the currently authenticated user.
                    if (user.id === gist.owner.id)
                    {
                        return gist;
                    }
                    return false;
                }
                return gist;
            }
            catch ({ status })
            {
                throw this._createError(status);
            }
        }
        return false;
    }

    /**
     * Creates a new gist.
     *
     * @param content Gist content.
     */
    public async create(content: Github.GistsCreateParams): Promise<GitHubTypes.IGist>
    {
        try
        {
            const result = await this._api.gists.create(content);
            return result.data as any;
        }
        catch ({ status })
        {
            throw this._createError(status);
        }
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
    public async findAndUpdate(
        id: string,
        uploads: ISetting[],
        upsert = true,
        showIndicator = false
    ): Promise<GitHubTypes.IGist>
    {
        if (showIndicator)
        {
            Toast.showSpinner(localize("toast.settings.uploading"));
        }

        try
        {
            let result: GitHubTypes.IGist;
            const exists = await this.exists(id);

            // Preparing local gist.
            const localGist: { gist_id: string, files: any } = { gist_id: id, files: {} };
            for (const item of uploads)
            {
                // Filter out `null` content.
                if (item.content)
                {
                    localGist.files[item.remoteFilename] = { content: item.content };
                }
            }

            if (exists)
            {
                // Upload if the local files are modified.
                localGist.files = this._getModifiedFiles(localGist.files, exists.files);
                if (localGist.files)
                {
                    // poka-yoke - Determines whether there're too much changes since the last uploading.
                    const threshold = getVSCodeSetting<number>(CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD);
                    if (threshold > 0)
                    {
                        // Note that the local settings here have already been excluded.
                        const localFiles = { ...localGist.files };
                        const remoteFiles = pick(exists.files, Object.keys(localFiles));

                        // Diff settings.
                        const changes = this._diffSettings(localFiles, remoteFiles);
                        if (changes >= threshold)
                        {
                            const okButton = localize("pokaYoke.continue.upload");
                            const message = localize("pokaYoke.continue.upload.message");
                            const selection = await Toast.showConfirmBox(message, okButton, localize("pokaYoke.cancel"));
                            if (selection !== okButton)
                            {
                                throw new Error(localize("error.abort.synchronization"));
                            }
                        }
                    }
                    result = await this.update(localGist);
                }
                else
                {
                    // Nothing changed.
                    result = exists;
                }
            }
            else
            {
                if (upsert)
                {
                    // TODO: Pass gist public option.
                    result = await this.createSettings(localGist.files);
                }
                else
                {
                    throw new Error(localize("error.gist.notfound", id));
                }
            }

            if (showIndicator)
            {
                Toast.clearSpinner("");
            }
            return result;
        }
        catch (error)
        {
            if (showIndicator)
            {
                Toast.statusError(localize("toast.settings.uploading.failed", error.message));
            }
            throw error;
        }
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
                // Ignore the null local file.
                if (localFile.content && localFile.content !== remoteFile.content)
                {
                    result[key] = localFile;
                }
            }
            else
            {
                // Remove the remote files except keybindings and settings.
                if (!key.includes(SettingTypes.Keybindings) && !key.includes(SettingTypes.Settings))
                {
                    result[key] = null;
                }
            }
            recordedKeys.push(key);
        }

        // Add the rest local files.
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
        error["code"] = code;
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
        const extensionsRemoteFilename = `${SettingTypes.Extensions}.json`;
        let file: GitHubTypes.IGistFile;
        let parsed: object;
        const result = {};
        for (const key of Object.keys(files))
        {
            file = files[key];
            if (file)
            {
                parsed = parse(file.content || "");

                if (key === extensionsRemoteFilename && Array.isArray(parsed))
                {
                    for (const ext of parsed)
                    {
                        if (ext["id"] != null)
                        {
                            ext["id"] = ext["id"].toLocaleLowerCase();
                        }

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
