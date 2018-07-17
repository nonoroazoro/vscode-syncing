import { IExtensionMeta } from "../common/vscodeWebAPITypes";
import { post } from "./ajax";

/**
 * Query extensions.
 */
export function queryExtensions(ids: string[], proxy?: string): Promise<IExtensionMeta[]>
{
    const api = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
    const headers = {
        Accept: "application/json;api-version=3.0-preview.1"
    };
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

    return post(api, data, headers, proxy).then((res) =>
    {
        let extensions = [];
        try
        {
            const { results } = JSON.parse(res);
            if (results.length > 0)
            {
                extensions = results[0].extensions || [];
            }
        }
        catch (err)
        {
        }
        return extensions;
    });
}