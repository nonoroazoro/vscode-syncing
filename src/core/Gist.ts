import { Octokit } from "@octokit/rest";
import { HttpsProxyAgent } from "https-proxy-agent";
import pick = require("lodash.pick");

import { clearSpinner, showConfirmBox, showSpinner, statusError } from "./Toast";
import { CONFIGURATION_KEY, CONFIGURATION_POKA_YOKE_THRESHOLD } from "../constants";
import { createError } from "../utils/errors";
import { diff } from "../utils/diffPatch";
import { getVSCodeSetting } from "../utils/vscodeAPI";
import { isEmptyString } from "../utils/lang";
import { localize } from "../i18n";
import { parse } from "../utils/jsonc";
import { SettingType } from "../types";
import type {
    GistCreateParam,
    GistUpdateParam,
    IGist,
    IGistFile,
    IGistFiles,
    IGistUser,
    ISetting
} from "../types";

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

    private _api: Octokit;
    private _proxy?: string;
    private _token?: string;

    private constructor(token?: string, proxy?: string)
    {
        this._proxy = proxy;

        const options: { auth?: any; request: { agent?: any; timeout?: number } } = { request: { timeout: 8000 } };
        if (proxy != null && !isEmptyString(proxy))
        {
            options.request.agent = new HttpsProxyAgent(proxy);
        }

        this._token = token;
        if (token != null && !isEmptyString(token))
        {
            options.auth = `token ${token}`;
        }

        this._api = new Octokit(options);
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
     *
     * @throws {IEnhancedError}
     */
    public async user(): Promise<IGistUser>
    {
        try
        {
            return (await this._api.users.getAuthenticated()).data;
        }
        catch (err: any)
        {
            throw this._createError(err);
        }
    }

    /**
     * Gets the gist of the currently authenticated user.
     *
     * @param id Gist id.
     * @param showIndicator Defaults to `false`, don't show progress indicator.
     *
     * @throws {IEnhancedError}
     */
    public async get(id: string, showIndicator: boolean = false): Promise<IGist>
    {
        if (showIndicator)
        {
            showSpinner(localize("toast.settings.checking.remote"));
        }

        try
        {
            const result = (await this._api.gists.get({ gist_id: id })).data as IGist;
            if (showIndicator)
            {
                clearSpinner("");
            }
            return result;
        }
        catch (err: any)
        {
            const error = this._createError(err);
            if (showIndicator)
            {
                statusError(localize("toast.settings.downloading.failed", error.message));
            }
            throw error;
        }
    }

    /**
     * Gets all the gists of the currently authenticated user.
     *
     * @throws {IEnhancedError}
     */
    public async getAll(): Promise<IGist[]>
    {
        try
        {
            // Find and sort VSCode settings gists by time in ascending order.
            const gists = (await this._api.gists.list()).data as unknown as IGist[];
            const extensionsRemoteFilename = `${SettingType.Extensions}.json`;
            return gists
                .filter(gist => (gist.description === Gist.GIST_DESCRIPTION || gist.files[extensionsRemoteFilename]))
                .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        }
        catch (err: any)
        {
            throw this._createError(err);
        }
    }

    /**
     * Delete gist.
     *
     * @param id Gist id.
     *
     * @throws {IEnhancedError}
     */
    public async delete(id: string): Promise<void>
    {
        try
        {
            await this._api.gists.delete({ gist_id: id });
        }
        catch (err: any)
        {
            throw this._createError(err);
        }
    }

    /**
     * Update gist.
     *
     * @param {GistUpdateParam} content Gist content.
     *
     * @throws {IEnhancedError}
     */
    public async update(content: GistUpdateParam): Promise<IGist>
    {
        try
        {
            return (await this._api.gists.update(content as any)).data as IGist;
        }
        catch (err: any)
        {
            throw this._createError(err);
        }
    }

    /**
     * Determines whether the specified gist exists.
     *
     * @param id Gist id.
     */
    public async exists(id: string): Promise<IGist | false>
    {
        if (id != null && !isEmptyString(id))
        {
            try
            {
                const gist = await this.get(id);
                if (this.token != null)
                {
                    const user = await this.user();
                    // Determines whether the owner of the gist is the currently authenticated user.
                    if (user.id !== gist.owner.id)
                    {
                        return false;
                    }
                }
                return gist;
            }
            catch
            {
                // Ignore error.
            }
        }
        return false;
    }

    /**
     * Creates a new gist.
     *
     * @param {GistCreateParam} content Gist content.
     *
     * @throws {IEnhancedError}
     */
    public async create(content: GistCreateParam): Promise<IGist>
    {
        try
        {
            return (await this._api.gists.create(content as any)).data as IGist;
        }
        catch (err: any)
        {
            throw this._createError(err);
        }
    }

    /**
     * Creates a new settings gist.
     *
     * @param files Settings files.
     * @param isPublic Defaults to `false`, the gist is set to private.
     *
     * @throws {IEnhancedError}
     */
    public createSettings(files = {}, isPublic = false): Promise<IGist>
    {
        return this.create({
            files,
            description: Gist.GIST_DESCRIPTION,
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
     *
     * @throws {IEnhancedError}
     */
    public async findAndUpdate(
        id: string,
        uploads: ISetting[],
        upsert = true,
        showIndicator = false
    ): Promise<IGist>
    {
        if (showIndicator)
        {
            showSpinner(localize("toast.settings.uploading"));
        }

        try
        {
            let result: IGist;
            const exists = await this.exists(id);

            // Preparing local gist.
            const localGist: { gist_id: string; files: any } = { gist_id: id, files: {} };
            for (const item of uploads)
            {
                // Filter out `null` content.
                if (item.content != null)
                {
                    localGist.files[item.remoteFilename] = { content: item.content };
                }
            }

            if (exists)
            {
                // Upload if the local files are modified.
                localGist.files = this.getModifiedFiles(localGist.files, exists.files);
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
                            const selection = await showConfirmBox(
                                message,
                                okButton,
                                localize("pokaYoke.cancel")
                            );
                            if (selection !== okButton)
                            {
                                throw createError(localize("error.abort.synchronization"));
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
                    throw createError(localize("error.gist.notfound", id));
                }
            }

            if (showIndicator)
            {
                clearSpinner("");
            }
            return result;
        }
        catch (error: any)
        {
            if (showIndicator)
            {
                statusError(localize("toast.settings.uploading.failed", error.message));
            }
            throw error;
        }
    }

    /**
     * Compares the local and remote files, returns the modified files or `undefined`.
     *
     * @param {IGistFiles} localFiles Local files.
     * @param {IGistFiles} [remoteFiles] Remote files.
     */
    public getModifiedFiles(
        localFiles: IGistFiles,
        remoteFiles?: IGistFiles
    ): IGistFiles | undefined
    {
        if (!remoteFiles)
        {
            return localFiles;
        }

        let localFile: IGistFile;
        let remoteFile: IGistFile;
        const result = {} as IGistFiles;
        const recordedKeys = [];
        for (const key of Object.keys(remoteFiles))
        {
            localFile = localFiles[key];
            remoteFile = remoteFiles[key];
            if (localFile)
            {
                // Ignore null local file.
                if (localFile.content != null && localFile.content !== remoteFile.content)
                {
                    result[key] = localFile;
                }
            }
            else
            {
                // Remove the remote files except keybindings and settings.
                if (!key.includes(SettingType.Keybindings) && !key.includes(SettingType.Settings))
                {
                    result[key] = null as any;
                }
            }
            recordedKeys.push(key);
        }

        // Add the rest local files.
        for (const key of Object.keys(localFiles))
        {
            if (!recordedKeys.includes(key))
            {
                // Ignore null local file.
                localFile = localFiles[key];
                if (localFile.content)
                {
                    result[key] = localFile;
                }
            }
        }

        return (Object.keys(result).length === 0) ? undefined : result;
    }

    /**
     * Creates the error from an error code.
     */
    private _createError(error: Error & { status: number })
    {
        const { status } = error;
        let message = localize("error.check.internet");
        if (status === 401)
        {
            message = localize("error.check.github.token");
        }
        else if (status === 404)
        {
            message = localize("error.check.gist.id");
        }
        console.error("Syncing:", error);
        return createError(message, status);
    }

    /**
     * Calculates the number of differences between the local and remote files.
     */
    private _diffSettings(localFiles: IGistFiles, remoteFiles: IGistFiles): number
    {
        const left = this._parseToJSON(localFiles);
        const right = this._parseToJSON(pick(remoteFiles, Object.keys(localFiles)));
        return diff(left, right);
    }

    /**
     * Converts the `content` of `IGistFiles` into a `JSON object`.
     */
    private _parseToJSON(files: IGistFiles): Record<string, any>
    {
        const extensionsRemoteFilename = `${SettingType.Extensions}.json`;
        let parsed: any;
        let file: IGistFile;
        const result: Record<string, any> = {};
        for (const key of Object.keys(files))
        {
            file = files[key];
            if (file)
            {
                parsed = parse(file.content ?? "");

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
