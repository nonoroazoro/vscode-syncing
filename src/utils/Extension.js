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
                metadata: ext.packageJSON.__metadata,
                name: ext.packageJSON.name,
                publisher: ext.packageJSON.publisher,
                version: ext.packageJSON.version
            });
        }
    }
    return result;
}

/**
 * install extensions.
 * @param {string|Array} p_list extension id or extension id list.
 */
function install(p_extensions)
{
    return new Promise((p_resolve, p_reject) =>
    {
        if (p_extensions)
        {
            let extensions = p_extensions;
            if (typeof p_extensions === "string")
            {
                extensions = [p_extensions];
            }

            if (Array.isArray(extensions))
            {
                // TODO: install extension.
                // for (let ext of extensions)
                // {
                // }
            }
        }
        p_resolve();
    });
}

module.exports = {
    getAll,
    install
};
