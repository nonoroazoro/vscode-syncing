import * as fs from "fs-extra";
import { HttpsProxyAgent } from "https-proxy-agent";
import * as https from "node:https";
import * as zlib from "node:zlib";

import { isEmptyString } from "./lang";

/**
 * Posts a request.
 *
 * @param {string} api The post url.
 * @param {unknown} data The post data.
 * @param {Record<string, string>} headers The headers.
 * @param {string} [proxy] The proxy settings.
 */
export async function post(
    api: string,
    data: unknown,
    headers: Record<string, string>,
    proxy?: string
): Promise<string>
{
    return new Promise((resolve, reject) =>
    {
        const body = JSON.stringify(data);
        const options: https.RequestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": body.length,
                ...headers
            }
        };
        if (proxy != null && !isEmptyString(proxy))
        {
            options.agent = new HttpsProxyAgent(proxy);
        }

        const req = https.request(api, options, res =>
        {
            if (res.statusCode === 200)
            {
                let result = "";
                res.on("data", chunk =>
                {
                    result += chunk;
                });

                res.on("end", () =>
                {
                    resolve(result);
                });
            }
            else
            {
                reject(new Error(res.statusMessage));
            }
        }).on("error", err =>
        {
            reject(err);
        });

        req.write(body);
        req.end();
    });
}

/**
 * Downloads a file.
 *
 * @param {string} uri The resource uri.
 * @param {string} savepath The path where the file will be saved;
 * @param {string} [proxy] The proxy settings.
 */
export async function downloadFile(uri: string, savepath: string, proxy?: string): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        const options: https.RequestOptions = {};
        if (proxy != null && !isEmptyString(proxy))
        {
            options.agent = new HttpsProxyAgent(proxy);
        }

        const file = fs.createWriteStream(savepath);
        file.on("finish", () =>
        {
            file.close();
            resolve();
        });
        https.get(uri, options, res =>
        {
            if (res.statusCode === 200)
            {
                let intermediate: zlib.Gunzip | zlib.Inflate | undefined;
                const contentEncoding = res.headers["content-encoding"];
                if (contentEncoding === "gzip")
                {
                    intermediate = zlib.createGunzip();
                }
                else if (contentEncoding === "deflate")
                {
                    intermediate = zlib.createInflate();
                }

                if (intermediate)
                {
                    res.pipe(intermediate).pipe(file);
                }
                else
                {
                    res.pipe(file);
                }
            }
            else
            {
                reject(new Error(res.statusMessage));
            }
        }).on("error", err =>
        {
            // Close and remove the temp file.
            file.close();
            fs.remove(savepath)
                .catch(() => {})
                .finally(() => { reject(err); });
        });
    });
}
