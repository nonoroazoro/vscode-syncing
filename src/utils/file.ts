import * as fs from "fs-extra";

/**
 * Reads the last modified time of the file.
 *
 * `Note:` Returns `undefined` if the file is not exists or error occurs.
 *
 * @param {string} path The path of the file.
 */
export function readLastModified(path: string): Promise<number | undefined>
{
    return new Promise((resolve) =>
    {
        fs.stat(path, (err, stats) => resolve(err ? undefined : stats.mtimeMs));
    });
}
