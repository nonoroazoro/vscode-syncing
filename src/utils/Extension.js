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

            p_resolve();
        });
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
            const reservedExtensionIDs = [];

            // find added & changed extensions.
            for (const ext of p_extensions)
            {
                localExtension = vscode.extensions.getExtension(ext.id);
                if (localExtension)
                {
                    if (localExtension.packageJSON.version === ext.version)
                    {
                        // reserved.
                        reservedExtensionIDs.push(ext.id);
                    }
                    else
                    {
                        // changed.
                        extensions.changed.push(ext);
                    }
                }
                else
                {
                    // added.
                    extensions.added.push(ext);
                }
            }

            const localExtensions = getAll();
            for (const ext of localExtensions)
            {
                if (!reservedExtensionIDs.includes(ext.id))
                {
                    // removed.
                    extensions.removed.push(ext);
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
