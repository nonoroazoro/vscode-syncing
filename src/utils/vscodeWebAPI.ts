import { satisfies } from "compare-versions";
import * as vscode from "vscode";

import { CaseInsensitiveMap } from "../collections";
import { ExtensionAssetType, QueryFilterType, QueryFlag } from "../types";
import { post } from "./ajax";
import type { IExtensionMeta, IExtensionVersion } from "../types";

/**
 * Represents the property key of the extension engine.
 */
export const EXTENSION_ENGINE_PROPERTY_KEY = "Microsoft.VisualStudio.Code.Engine";

/**
 * Query the extensions' meta data.
 *
 * @param {string[]} ids The id list of extensions. The id is in the form of: `publisher.name`.
 * @param {string} [proxy] The proxy settings.
 */
export async function queryExtensions(
    ids: string[],
    proxy?: string
): Promise<CaseInsensitiveMap<string, IExtensionMeta>>
{
    const result = new CaseInsensitiveMap<string, IExtensionMeta>();
    if (ids.length > 0)
    {
        const api = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
        const headers = { Accept: "application/json;api-version=5.1-preview.1" };
        const data = {
            filters: [
                {
                    criteria: ids.map((name) =>
                    {
                        return {
                            filterType: QueryFilterType.NAME,
                            value: name
                        };
                    })
                }
            ],
            flags: QueryFlag.LATEST_VERSION_WITH_FILES
        };

        try
        {
            const res = await post(api, data, headers, proxy);
            const { results } = JSON.parse(res);
            if (results.length > 0)
            {
                (results[0].extensions ?? []).forEach((extension: IExtensionMeta) =>
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
 * @param {IExtensionMeta} extensionMeta The extension's meta object.
 */
export function findLatestSupportedVSIXVersion(extensionMeta: IExtensionMeta): string | undefined
{
    return extensionMeta.versions.find(v => isVSIXSupported(v))?.version;
}

/**
 * Gets the VSIX download URL.
 *
 * @deprecated The download speed of this URL is too low.
 *
 * @param {IExtensionVersion} version The extension's version object.
 */
export function getVSIXDownloadURL(version: IExtensionVersion): string | undefined
{
    const files = version.files;
    if (files != null)
    {
        const file = files.find(f => (f.assetType === ExtensionAssetType.SERVICES_VSIXPACKAGE));
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
 * @param {IExtensionVersion} version The specified extension version.
 */
export function isVSIXSupported(version: IExtensionVersion)
{
    const requiredVersion = version.properties?.find(p => p.key === EXTENSION_ENGINE_PROPERTY_KEY)?.value;
    try
    {
        return requiredVersion == null ? true : satisfies(vscode.version, requiredVersion);
    }
    catch
    {
        return false;
    }
}
