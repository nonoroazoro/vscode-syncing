import { coerce, lte } from "semver";
import * as vscode from "vscode";

import { CaseInsensitiveMap } from "../collections";
import { ExtensionAssetType, ExtensionPropertyType, QueryFilterType, QueryFlag } from "../types";
import { post } from "./ajax";
import type { ExtensionMeta, ExtensionVersion } from "../types";

/**
 * Query the extensions' meta data.
 *
 * @param {string[]} ids The id list of extensions. The id is in the form of: `publisher.name`.
 * @param {string} [proxy] The proxy settings.
 */
export async function queryExtensions(ids: string[], proxy?: string)
{
    const result = new CaseInsensitiveMap<string, ExtensionMeta>();
    if (ids.length > 0)
    {
        const api = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
        const headers = { Accept: "application/json;api-version=5.1-preview.1" };
        const data = {
            filters: [
                {
                    criteria: ids.map(name => ({
                        filterType: QueryFilterType.EXTENSION_NAME,
                        value: name
                    }))
                }
            ],
            flags: QueryFlag.IncludeVersionProperties | QueryFlag.ExcludeNonValidated
        };

        try
        {
            const res = await post(api, data, headers, proxy);
            const { results } = JSON.parse(res);
            if (results.length > 0)
            {
                (results[0].extensions ?? []).forEach((extension: ExtensionMeta) =>
                {
                    // Use extension's fullname as the key.
                    result.set(`${extension.publisher.publisherName}.${extension.extensionName}`, extension);
                });
            }
        }
        catch
        {
            // Ignore error.
        }
    }
    return result;
}

/**
 * Finds the latest supported version of the VSIX file.
 *
 * @param {ExtensionMeta} extensionMeta The extension's meta object.
 * @param {boolean} [includePreRelease=false] Whether to include the pre-release version. Defaults to `false`.
 */
export function findLatestSupportedVSIXVersion(extensionMeta: ExtensionMeta, includePreRelease = false): string | undefined
{
    return extensionMeta.versions.find(v => isVSIXSupported(v, includePreRelease))?.version;
}

/**
 * Gets the VSIX download URL.
 *
 * @deprecated The download speed of this URL is too low.
 *
 * @param {ExtensionVersion} version The extension's version object.
 */
export function getVSIXDownloadURL(version: ExtensionVersion): string | undefined
{
    const files = version.files;
    if (files != null)
    {
        const file = files.find(f => (f.assetType === ExtensionAssetType.VSIX));
        if (file != null)
        {
            return file.source;
        }
    }
    return;
}

/**
 * Checks if the extension version is supported by current VSCode.
 *
 * @param {ExtensionVersion} version The specified extension version.
 * @param {boolean} includePreRelease Whether to include the pre-release version.
 */
export function isVSIXSupported(version: ExtensionVersion, includePreRelease: boolean)
{
    if (!includePreRelease)
    {
        if (version.properties?.find(p => p.key === ExtensionPropertyType.PRE_RELEASE)?.value === "true")
        {
            // Exclude pre-release version.
            return false;
        }
    }

    const requiredVersion = coerce(version.properties?.find(p => p.key === ExtensionPropertyType.ENGINE)?.value)?.version;
    try
    {
        return requiredVersion == null ? true : lte(requiredVersion, vscode.version);
    }
    catch
    {
        return false;
    }
}
