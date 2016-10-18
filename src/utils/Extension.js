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

module.exports = {
    getAll
};
