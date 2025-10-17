import { coerce, lte } from "semver";
import * as vscode from "vscode";

import { CaseInsensitiveMap } from "../collections";
import { ExtensionAssetType, ExtensionPropertyType, QueryFilterType, QueryFlag } from "../types";
import type { ExtensionMeta, ExtensionVersion, IExtension, Query } from "../types";
import { post } from "./ajax";

/**
 * Query the extensions' meta data.
 *
 * @param {string[]} ids The id list of extensions. The id is in the form of: `publisher.name`.
 * @param {string} [proxy] The proxy settings.
 */
export async function queryExtensions(ids: string[], proxy?: string)
{
    const result = new CaseInsensitiveMap<ExtensionMeta>();
    if (ids.length > 0)
    {
        const api = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
        const headers = { "Accept": "application/json;api-version=7.2-preview.1;excludeUrls=true" };
        const data: Query = {
            filters: [
                {
                    criteria: ids.map(name => ({
                        filterType: QueryFilterType.EXTENSION_NAME,
                        value: name
                    }))
                }
            ],
            flags: QueryFlag.IncludeLatestVersionOnly
                | QueryFlag.IncludeVersionProperties
                | QueryFlag.ExcludeNonValidated
        };

        try
        {
            const res = await post(api, data, headers, proxy);
            const results = JSON.parse(res).results as Array<{ extensions?: ExtensionMeta[]; }> | undefined;
            results?.[0]?.extensions?.forEach(extension =>
            {
                // Use extension's fullname as the key.
                result.set(`${extension.publisher.publisherName}.${extension.extensionName}`, extension);
            });
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
 * @param {boolean} [allowPreReleaseVersions=false] Whether to allow pre-release versions. Defaults to `false`.
 */
export function findLatestSupportedVSIXVersion(extensionMeta: ExtensionMeta, allowPreReleaseVersions = false)
{
    return extensionMeta.versions.find(v => isVSIXSupported(v, allowPreReleaseVersions))?.version;
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
 * Gets the extension's offline install package url.
 */
export function getExtensionDownloadURL(extension: IExtension)
{
    // See:
    // https://vscode-docs1.readthedocs.io/en/latest/editor/extension-gallery/
    // https://gist.github.com/wanglf/7acc591890dc0d8ceff1e7ec9af32a55
    return `https://${extension.publisher}.gallery.vsassets.io/_apis/public/gallery/`
        + `publisher/${extension.publisher}/extension/${extension.name}/${extension.version}/`
        + "assetbyname/Microsoft.VisualStudio.Services.VSIXPackage";
}

/**
 * Checks if the extension version is supported by current VSCode.
 *
 * @param {ExtensionVersion} version The specified extension version.
 * @param {boolean} allowPreReleaseVersions Whether to allow pre-release versions.
 */
export function isVSIXSupported(version: ExtensionVersion, allowPreReleaseVersions: boolean)
{
    if (!allowPreReleaseVersions)
    {
        if (version.properties?.find(p => p.key === ExtensionPropertyType.PRE_RELEASE)?.value === "true")
        {
            // Exclude pre-release version.
            return false;
        }
    }

    const requiredVersion = coerce(version.properties?.find(p => p.key === ExtensionPropertyType.ENGINE)?.value)
        ?.version;
    try
    {
        return requiredVersion == null ? true : lte(requiredVersion, vscode.version);
    }
    catch
    {
        return false;
    }
}
