import * as fs from "fs-extra";

import { parse } from "./date";

/**
 * Reads the last modified time (in milliseconds) of the file.
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

/**
 * Sets the last modified time (in milliseconds) of the file.
 *
 * @param {string} path The path of the file.
 * @param {(Date | number | string)} mtime The new last modified time.
 */
export async function writeLastModified(path: string, mtime: Date | number | string)
{
    try
    {
        const newMTime = parse(mtime);
        await fs.utimes(path, newMTime, newMTime);
    }
    catch
    { }
}
