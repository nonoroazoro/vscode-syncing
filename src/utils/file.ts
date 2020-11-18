import * as fs from "fs-extra";

import { parse } from "./date";

/**
 * Reads the last modified time (in milliseconds) of the file.
 *
 * `Note:` Returns `undefined` if the file is not exists or error occurs.
 *
 * @param {string} path The path of the file.
 */
export async function readLastModified(path: string): Promise<number | undefined>
{
    let result: number | undefined;
    try
    {
        result = (await fs.stat(path)).mtimeMs;
    }
    catch
    {
        // Ignore error.
    }
    return result;
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
    {
        // Ignore error.
    }
}
