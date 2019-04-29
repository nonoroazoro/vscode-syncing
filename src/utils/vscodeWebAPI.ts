import { CaseInsensitiveMap } from "../collections";
import
{
    ExtensionAssetType,
    IExtensionMeta,
    IExtensionVersion,
    QueryFilterType,
    QueryFlag
} from "../types/VSCodeWebAPITypes";
import { post } from "./ajax";

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
                (results[0].extensions || []).forEach((extension: IExtensionMeta) =>
                {
                    // Use extension's fullname as the key.
                    result.set(`${extension.publisher.publisherName}.${extension.extensionName}`, extension);
                });
            }
        }
        catch (err)
        {
        }
    }
    return result;
}

/**
 * Gets the latest version of the VSIX file.
 *
 * @param {IExtensionMeta} extensionMeta The extension's meta object.
 */
export function getLatestVSIXVersion(extensionMeta: IExtensionMeta): string | undefined
{
    const versionMeta = extensionMeta.versions[0];
    return versionMeta ? versionMeta.version : undefined;
}

/**
 * Gets the VSIX download URL.
 *
 * @deprecated The download speed of this URL is too slow.
 *
 * @param {IExtensionVersion} version The extension's version object.
 */
export function getVSIXDownloadURL(version: IExtensionVersion): string | undefined
{
    const files = version.files;
    if (files)
    {
        const file = files.find((f) => (f.assetType === ExtensionAssetType.SERVICES_VSIXPACKAGE));
        if (file)
        {
            return file.source;
        }
    }
    return;
}
