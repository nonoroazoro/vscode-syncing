/**
 * vscode extension utils.
 */

const vscode = require("vscode");

/**
 * get all installed extensions.
 * @param {boolean} [p_includeBuiltin=false] default is false, builtin extensions are not included.
 * @returns {Array} or `[]`.
 */
function getAll(p_includeBuiltin = false)
{
    const result = [];
    for (const ext of vscode.extensions.all)
    {
        if (p_includeBuiltin || !ext.packageJSON.isBuiltin)
        {
            result.push({
                name: ext.packageJSON.name,
                publisher: ext.packageJSON.publisher,
                version: ext.packageJSON.version,
                id: `${ext.packageJSON.publisher}.${ext.packageJSON.name}`
            });
        }
    }
    return result;
}

/**
 * install extensions.
 * @param {Array} p_extensions extensions list.
 */
function install(p_extensions)
{
    return new Promise((p_resolve, p_reject) =>
    {
        _getDifferentExtensions(p_extensions).then((diff) =>
        {
            if (diff.added.length > 0)
            {
                // TODO: add extensions
            }

            if (diff.changed.length > 0)
            {
                // TODO: changed extensions (maybe updated)
            }

            if (diff.removed.length > 0)
            {
                // TODO: remove extensions
            }
        });
        p_resolve();
    });
}

/**
 * get extensions that are added/changed/removed.
 * @param {Array} p_extensions
 * @returns {Promise}
 */
function _getDifferentExtensions(p_extensions)
{
    return new Promise((p_resolve, p_reject) =>
    {
        const extensions = { added: [], changed: [], removed: [] };
        if (p_extensions)
        {
            let localExtension;
            const reservedExtensions = [];

            // find added & changed extensions.
            for (const extension of p_extensions)
            {
                localExtension = vscode.extensions.getExtension(extension.id);
                if (localExtension)
                {
                    if (localExtension.packageJSON.version === extension.version)
                    {
                        // reserved.
                        reservedExtensions.push(extension.id);
                    }
                    else
                    {
                        // changed.
                        extensions.changed.push(extension);
                    }
                }
                else
                {
                    // added.
                    extensions.added.push(extension);
                }
            }

            const localExtensions = getAll();
            for (const extension of localExtensions)
            {
                if (!reservedExtensions.includes(extension.id))
                {
                    // removed.
                    extensions.removed.push(extension);
                }
            }
        }
        p_resolve(extensions);
    });
}

module.exports = {
    getAll,
    install
};
