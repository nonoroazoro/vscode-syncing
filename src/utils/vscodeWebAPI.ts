import
{
    ExtensionAssetType,
    IExtensionMeta,
    IExtensionVersion,
    QueryFilterType,
    QueryFlag
} from "../common/VSCodeWebAPITypes";
import { post } from "./ajax";

/**
 * Query extensions.
 *
 * @param {string[]} ids The id list of extensions. The id is in the form of: `publisher.name`.
 * @param {string} [proxy] The proxy settings.
 */
export async function queryExtensions(ids: string[], proxy?: string): Promise<Map<string, IExtensionMeta>>
{
    const result = new Map<string, IExtensionMeta>();
    if (ids.length > 0)
    {
        const api = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
        const headers = { Accept: "application/json;api-version=3.0-preview.1" };
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
                    // The key is the extension's id.
                    result.set(
                        `${extension.publisher.publisherName}.${extension.extensionName}`,
                        extension
                    );
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
 * Gets VSIX package URL.
 *
 * @param {IExtensionVersion} version An extension version object.
 */
export function getVSIXPackageURL(version: IExtensionVersion): string | undefined
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
    return undefined;
}
