import * as Github from "github";
import * as vscode from "vscode";

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
    private _token: string;
    private _user: { name: string, id: string } | null;

    private constructor(token: string, proxy?: string)
    {
        this._proxy = proxy;
        this._api = new Github(Object.assign({ timeout: 10000 }, proxy ? { proxy } : {}));
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
    public static create(token: string, proxy?: string): Gist
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
    public user(): Promise<{ name: string, id: string } | null>
    {
        return new Promise((resolve) =>
        {
            if (this._user)
            {
                resolve(this._user);
            }
            else
            {
                // TODO: 测试一下 get({}) 不传参数是否正确。
                this._api.users
                    .get()
                    .then((value) =>
                    {
                        this._user = { name: value.login, id: value.id };
                        resolve(this._user);
                    })
                    .catch(() =>
                    {
                        this._user = null;
                        resolve();
                    });
            }
        });
    }

    /**
     * Get gist of the authenticated user.
     * @param id Gist id.
     * @param showIndicator Default is `false`, don't show progress indicator.
     */
    public get(id: string, showIndicator: boolean = false): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            function resolveWrap(value: any)
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
                    Toast.statusError(`Syncing: Downloading failed. ${error.message}`);
                }
                reject(error);
            }

            if (showIndicator)
            {
                Toast.showSpinner("Syncing: Checking remote settings.");
            }

            this._api.gists.get({ id }).then(resolveWrap).catch((err) =>
            {
                let error = new Error("Please check your Internet connection.");
                const code: number = err.code;
                if (code === 401)
                {
                    error = new Error("Please check your GitHub Personal Access Token.");
                }
                else if (code === 404)
                {
                    error = new Error("Please check your Gist ID.");
                }
                Object.assign(error, { code });
                rejectWrap(error);
            });
        });
    }

    /**
     * Get all gists of the authenticated user.
     */
    public getAll(): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._api.gists.getAll({}).then((gists: any[]) =>
            {
                if (gists)
                {
                    // filter out the VSCode settings.
                    resolve(gists
                        .filter((gist) => (gist.description === Gist.GIST_DESCRIPTION || gist.files["extensions.json"]))
                        .sort((a, b) => new Date(a.update_id).getTime() - new Date(b.update_id).getTime())
                    );
                }
                else
                {
                    resolve([]);
                }
            }).catch((err) =>
            {
                if (err.code === 401)
                {
                    const error = new Error("Please check your GitHub Personal Access Token.");
                    Object.assign(error, { code: err.code });
                    reject(error);
                }
                else if (err.code === 404)
                {
                    reject(new Error("Please check your Gist ID."));
                }
                else
                {
                    reject(new Error("Please check your Internet connection."));
                }
            });
        });
    }

    /**
     * Delete gist.
     * @param id Gist id.
     */
    public delete(id: string): Promise<any>
    {
        return this._api.gists.delete({ id });
    }

    /**
     * Update gist.
     * @param content Gist content.
     */
    public update(content: any): Promise<any>
    {
        return this._api.gists.edit(content);
    }

    /**
     * Check if gist exists of the currently authenticated user.
     * @param id Gist id.
     */
    public exists(id: string): Promise<boolean | any>
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
                            this.user().then((value) =>
                            {
                                // check if the Gist's owner is the currently authenticated user.
                                if (value && value.id === gist.owner.id)
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
    public create(content: any): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this._api.gists.create(content).then((gist) =>
            {
                resolve(gist);
            }).catch((err) =>
            {
                if (err.code === 401)
                {
                    const error = new Error("Please check your GitHub Personal Access Token.");
                    Object.assign(error, { code: err.code });
                    reject(error);
                }
                else
                {
                    reject(new Error("Please check your Internet connection."));
                }
            });
        });
    }

    /**
     * Create settings gist.
     * @param files Settings files.
     * @param isPublic Default is `false`, gist is set to private.
     */
    public createSettings(files = {}, isPublic = false): Promise<any>
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
     * @param showIndicator Default is `false`, don't show progress indicator.
     */
    public findAndUpdate(id: string, uploads: any, upsert = true, showIndicator = false): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            function resolveWrap(value: any)
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
                    // any `null` content will be filtered out, just in case.
                    if (item.content)
                    {
                        gist.files[item.remote] = { content: item.content };
                    }
                }

                if (exists)
                {
                    // only update when files are modified.
                    gist.files = this._getModifiedFiles(gist.files, exists.files);
                    if (gist.files)
                    {
                        this.update(gist).then(resolveWrap).catch(rejectWrap);
                    }
                    else
                    {
                        resolveWrap(exists);
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
     * @returns {} or `undefined`.
     */
    _getModifiedFiles(localFiles: any, remoteFiles: any): any
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

        return (Object.keys(result).length === 0) ? undefined : result;
    }
}
