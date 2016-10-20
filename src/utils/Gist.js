/**
 * GitHub Gist utils.
 */

const GitHubAPI = require("github");

class Gist
{
    /**
     * @param {string} p_token GitHub access token.
     * @param {Object} [p_options] node-github options.
     * @constructor
     */
    constructor(p_token, p_options)
    {
        if (!p_token)
        {
            throw new Error("Invalid GitHub Token.");
        }
        this._api = new GitHubAPI(Object.assign({ timeout: 5000 }, p_options));
        this._api.authenticate({
            type: "oauth",
            token: p_token
        });
    }

    /**
     * get gist.
     * @param {string} p_id gist id.
     * @returns {Promise}
     */
    get(p_id)
    {
        return this._api.gists.get({ id: p_id });
    }

    /**
     * delete gist.
     * @param {string} p_id gist id.
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
     * check if gist exists.
     * @param {string} p_id gist id.
     * @returns {Promise}
     */
    exists(p_id)
    {
        return new Promise((p_resolve) =>
        {
            p_id ?
                this.get(p_id)
                    .then((gist) => p_resolve(gist))
                    .catch(() => p_resolve(false))
                : p_resolve(false);
        });
    }

    /**
     * create gist.
     * @param {Object} p_json gist content.
     * @returns {Promise}
     */
    create(p_json)
    {
        return this._api.gists.create(p_json);
    }

    /**
     * create settings gist.
     * @param {Array} p_files settings files.
     * @param {boolean} [p_public=false] default is false, gist is private.
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
     * @param {string} p_id gist id.
     * @param {Object} p_uploads settings that will be uploaded.
     * @param {boolean} [p_upsert=true] default is true, create new if gist not exists.
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
                    gist.files[item.remote] = { content: item.content };
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
                        p_reject(new Error(`No such id in Gist: ${p_id}`));
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
        let file;
        const result = {};
        for (const key of Object.keys(p_localFiles))
        {
            file = p_localFiles[key];
            if (file.content !== p_remoteFiles[key].content)
            {
                result[key] = file;
            }
        }
        return (Object.keys(result).length === 0) ? undefined : result;
    }
}

module.exports = Gist;
