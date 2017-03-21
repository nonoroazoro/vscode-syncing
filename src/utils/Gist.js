/**
 * GitHub Gist utils.
 */

const GitHubAPI = require("github");

class Gist
{
    constructor(p_token, p_proxy)
    {
        this._token = p_token;
        this._proxy = p_proxy;
        this._api = new GitHubAPI(Object.assign({ timeout: 5000 }, p_proxy ? { proxy: p_proxy } : {}));

        if (p_token)
        {
            this._api.authenticate({
                type: "oauth",
                token: p_token
            });
        }
    }

    /**
     * get GitHub Personal Access Token.
     */
    get token()
    {
        return this._token;
    }

    /**
     * get proxy url.
     */
    get proxy()
    {
        return this._proxy;
    }

    /**
     * get the currently authenticated GitHub user.
     * @returns {Promise}
     */
    user()
    {
        return new Promise((p_resolve) =>
        {
            if (this._user)
            {
                p_resolve(this._user);
            }
            else
            {
                this._api.users
                    .get({})
                    .then((p_value) =>
                    {
                        this._user = { name: p_value.login, id: p_value.id };
                        p_resolve(this._user);
                    })
                    .catch((err) =>
                    {
                        this._user = null;
                        p_resolve(null);
                    });
            }
        });
    }

    /**
     * get gist.
     * @param {String} p_id gist id.
     * @returns {Promise}
     */
    get(p_id)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            this._api.gists.get({ id: p_id }).then((gist) =>
            {
                p_resolve(gist);
            }).catch((err) =>
            {
                if (err.code === 401)
                {
                    const error = new Error("Please check your GitHub Personal Access Token.");
                    error.code = err.code;
                    p_reject(error);
                }
                else if (err.code === 404)
                {
                    p_reject(new Error("Please check your Gist ID."));
                }
                else
                {
                    p_reject(new Error("Please check your Internet connection."));
                }
            });
        });
    }

    /**
     * delete gist.
     * @param {String} p_id gist id.
     * @returns {Promise}
     */
    delete(p_id)
    {
        return this._api.gists.delete({ id: p_id });
    }

    /**
     * update gist.
     * @param {Object} p_json gist content.
     * @returns {Promise}
     */
    update(p_json)
    {
        return this._api.gists.edit(p_json);
    }

    /**
     * check if gist exists of the currently authenticated user.
     * @param {String} p_id gist id.
     * @returns {Promise}
     */
    exists(p_id)
    {
        return new Promise((p_resolve) =>
        {
            if (p_id)
            {
                this.get(p_id)
                    .then((gist) =>
                    {
                        if (this.token)
                        {
                            this.user().then((value) =>
                            {
                                // check if the Gist's owner is the currently authenticated user.
                                if (value && value.id === gist.owner.id)
                                {
                                    p_resolve(gist);
                                }
                                else
                                {
                                    p_resolve(false);
                                }
                            });
                        }
                        else
                        {
                            p_resolve(gist);
                        }
                    })
                    .catch(() => p_resolve(false));
            }
            else
            {
                p_resolve(false);
            }
        });
    }

    /**
     * create gist.
     * @param {Object} p_json gist content.
     * @returns {Promise}
     */
    create(p_json)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            this._api.gists.create(p_json).then((gist) =>
            {
                p_resolve(gist);
            }).catch((err) =>
            {
                if (err.code === 401)
                {
                    const error = new Error("Please check your GitHub Personal Access Token.");
                    error.code = err.code;
                    p_reject(error);
                }
                else
                {
                    p_reject(new Error("Please check your Internet connection."));
                }
            });
        });
    }

    /**
     * create settings gist.
     * @param {Array} p_files settings files.
     * @param {Boolean} [p_public=false] default is false, gist is private.
     * @returns {Promise}
     */
    createSettings(p_files = {}, p_public = false)
    {
        return this.create({
            description: "VSCode's Settings - Syncing",
            public: p_public,
            files: p_files
        });
    }

    /**
     * find and update gist.
     * @param {String} p_id gist id.
     * @param {Object} p_uploads settings that will be uploaded.
     * @param {Boolean} [p_upsert=true] default is true, create new if gist not exists.
     * @returns {Promise}
     */
    findAndUpdate(p_id, p_uploads, p_upsert = true)
    {
        return new Promise((p_resolve, p_reject) =>
        {
            this.exists(p_id).then((exists) =>
            {
                const gist = { id: p_id, files: {} };
                for (const item of p_uploads)
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
                        p_resolve(this.update(gist));
                    }
                    else
                    {
                        p_resolve(exists);
                    }
                }
                else
                {
                    if (p_upsert)
                    {
                        // TODO: pass gist public.
                        p_resolve(this.createSettings(gist.files));
                    }
                    else
                    {
                        p_reject(new Error(`No such ID in Gist: ${p_id}`));
                    }
                }
            });
        });
    }

    /**
     * get modified files list.
     * @returns {} or `undefined`.
     */
    _getModifiedFiles(p_localFiles, p_remoteFiles)
    {
        let localFile;
        let remoteFile;
        const result = {};
        const recordedKeys = [];
        for (const key of Object.keys(p_remoteFiles))
        {
            localFile = p_localFiles[key];
            remoteFile = p_remoteFiles[key];
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
        for (const key of Object.keys(p_localFiles))
        {
            if (!recordedKeys.includes(key))
            {
                // ignore null local file.
                localFile = p_localFiles[key];
                if (localFile.content)
                {
                    result[key] = localFile;
                }
            }
        }

        return (Object.keys(result).length === 0) ? undefined : result;
    }
}

let _instance;
/**
 * only create new instance when params are changed.
 * @param {String} p_token GitHub Personal Access Token.
 * @param {String} [p_proxy] proxy url.
 * @returns {Gist}
 */
function create(p_token, p_proxy)
{
    if (_instance === undefined || _instance.token !== p_token || _instance.proxy !== p_proxy)
    {
        _instance = new Gist(p_token, p_proxy);
    }
    return _instance;
}

module.exports = {
    create
};
