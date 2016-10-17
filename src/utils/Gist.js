const GitHubAPI = require("github");

/**
 * GitHub Gist Utils.
 */
class Gist
{
    /**
     * init Gist.
     * @param {String} p_token GitHub access token.
     * @param {object} p_config extension's' Config.
     *
     */
    constructor(p_token, p_config)
    {
        if (!p_token)
        {
            throw new Error("Invalid GitHub Token.");
        }
        else if (!p_config)
        {
            throw new Error("Invalid Syncing Config.");
        }
        else
        {
            this._api = new GitHubAPI({ timeout: 5000 });
            this._api.authenticate({
                type: "oauth",
                token: p_token
            });

            // empty settings template.
            this._template = {
                description: "VSCode's Settings - Syncing",
                public: false,
                files: {}
            };
            p_config.uploads.forEach((item) =>
            {
                if (item.type === "file")
                {
                    this._template.files[item.remote] = { content: "// init" };
                }
            });
        }
    }

    /**
     * prepare syncing's settings.
     * if p_id is empty, create empty settings in Gist.
     * else check if gist of p_id exists.
     * @param {String} [p_id] gist id.
     * @param {Object} [p_options] options.
     * @returns {Promise}
     */
    prepare(p_id, p_options)
    {
        const options = p_options || {};
        return new Promise((p_resolve, p_reject) =>
        {
            this.exists(p_id).then((exists) =>
            {
                if (exists)
                {
                    p_resolve(p_id);
                }
                else
                {
                    this.createTemplate(options.public).then((gist) =>
                    {
                        p_resolve(gist.id);
                    }).catch((err) =>
                    {
                        p_reject(new Error(`Error Requesting Remote Gist, Code: ${err.code}`));
                    });
                }
            });
        });
    }

    /**
     * get gist.
     * @param {String} p_id gist id.
     * @returns {Promise}
     */
    get(p_id)
    {
        return this._api.gists.get({ id: p_id });
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
     * check if gist exists.
     * @param {String} p_id gist id.
     * @returns {Promise}
     */
    exists(p_id)
    {
        return new Promise((p_resolve) =>
        {
            p_id ?
                this.get(p_id)
                    .then(() => p_resolve(true))
                    .catch(() => p_resolve(false))
                : p_resolve(false);
        });
    }

    /**
     * create gist.
     * @param {String} p_id gist id.
     * @returns {Promise}
     */
    create(p_json)
    {
        return this._api.gists.create(p_json);
    }

    /**
     * create initial gist from template.
     * @param {Boolean} p_public default is false, gist is private.
     * @returns {Promise}
     */
    createTemplate(p_public = false)
    {
        return this.create(Object.assign({}, this._template, { public: p_public }));
    }

    /**
     * find and update gist.
     * @param {String} p_id gist id.
     * @param {Object} p_gist gist content.
     * @param {Boolean} p_upsert default is true, create new if gist not exists.
     * @returns {Promise}
     */
    findAndUpdate(p_id, p_gist, p_upsert = true)
    {
        // TODO
    }
}

module.exports = Gist;
