import * as Github from "@octokit/rest";
import * as HttpsProxyAgent from "https-proxy-agent";
import * as stripJsonComments from "strip-json-comments";

import { IConfig } from "./Config";
import { diff } from "./Diff";
import * as GitHubTypes from "./types/GitHub";

import Toast from "./Toast";

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
        this._api = new Github(Object.assign({ timeout: 10000 }, proxy ? { agent: new HttpsProxyAgent(proxy) } : {}));
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

            this._api.gists.get({ id }).then(resolveWrap).catch(({ code }) =>
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
        return this._api.gists.delete({ id }).then((res) => res.data);
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
    public findAndUpdate(id: string, uploads: IConfig[], upsert = true, showIndicator = false): Promise<GitHubTypes.IGist>
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
                const gist: { id: string, files: any } = { id, files: {} };
                for (const item of uploads)
                {
                    // `null` content will be filtered out, just in case.
                    if (item.content)
                    {
                        gist.files[item.remote] = { content: item.content };
                    }
                }

                if (exists)
                {
                    // only update when files are modified.
                    const remoteGist = exists as GitHubTypes.IGist;
                    gist.files = this._getModifiedFiles(gist.files, remoteGist.files);
                    if (gist.files)
                    {
                        // poka-yoke - check if there have been two much changes (more than 10 changes) since the last uploading.
                        const changes = this._diff(gist.files, remoteGist.files);
                        if (changes >= 10)
                        {
                            const okButton = "Continue to Upload";
                            const message = "The local settings have been changed a lot since your last upload. Please make sure you've checked everything.";
                            Toast.showConfirmBox(message, okButton, "Cancel").then((selection) =>
                            {
                                if (selection === okButton)
                                {
                                    this.update(gist).then(resolveWrap).catch(rejectWrap);
                                }
                                else
                                {
                                    rejectWrap(new Error("You abort the synchronization."));
                                }
                            });
                        }
                        else
                        {
                            this.update(gist).then(resolveWrap).catch(rejectWrap);
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
                        this.createSettings(gist.files).then(resolveWrap).catch(rejectWrap);
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
    private _getModifiedFiles(localFiles: any, remoteFiles: GitHubTypes.IGistFiles): any
    {
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
                if (!key.includes("keybindings") && !key.includes("settings"))
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
    private _diff(localFiles: GitHubTypes.IGistFiles, remoteFiles: GitHubTypes.IGistFiles): number
    {
        const localKeys = Object.keys(localFiles);
        const left = this.parseIntoJSON(localFiles, localKeys);
        const right = this.parseIntoJSON(remoteFiles, localKeys);
        return diff(left, right);
    }

    /**
     * Converts the `content` of `GitHubTypes.IGistFiles` into an object.
     */
    private parseIntoJSON(files: GitHubTypes.IGistFiles, keys: string[]): any
    {
        const result = {};
        keys.forEach((key) =>
        {
            try
            {
                result[key] = JSON.parse((stripJsonComments(files[key].content)));
            }
            catch (e)
            {
                result[key] = files[key].content;
            }
        });
        return result;
    }
}
