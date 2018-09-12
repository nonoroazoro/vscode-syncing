import { IExtensionMeta } from "../common/VSCodeWebAPITypes";
import { post } from "./ajax";

/**
 * Query extensions.
 *
 * @param {string[]} ids The UUID of the extensions.
 * @param {string} [proxy] The proxy settings.
 */
export async function queryExtensions(ids: string[], proxy?: string): Promise<Map<string, IExtensionMeta>>
{
    const result = new Map<string, IExtensionMeta>();
    if (ids.length > 0)
    {
        const api = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
        const headers = { Accept: "application/json; api-version=5.0-preview.1" };
        const data = {
            filters: [
                {
                    criteria: ids.map((id) =>
                    {
                        return {
                            filterType: 4,
                            value: id
                        };
                    })
                }
            ],
            flags: 133
        };

        try
        {
            const res = await post(api, data, headers, proxy);
            const { results } = JSON.parse(res);
            if (results.length > 0)
            {
                (results[0].extensions || []).forEach((extension: IExtensionMeta) =>
                {
                    result.set(extension.extensionId, extension);
                });
            }
        }
        catch (err)
        {
        }
    }
    return result;
}
