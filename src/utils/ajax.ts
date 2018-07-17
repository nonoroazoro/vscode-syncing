import * as https from "https";
import * as HttpsProxyAgent from "https-proxy-agent";
import * as url from "url";

/**
 * Post.
 *
 * @param {string} api The post url.
 * @param {any} data The post data.
 * @param {any} headers The headers.
 * @param {string} [proxy] The proxy settings.
 */
export function post(api: string, data: any, headers: any, proxy?: string): Promise<string>
{
    return new Promise((resolve, reject) =>
    {
        const body: string = JSON.stringify(data);
        const { hostname, path, port } = url.parse(api);
        const options: https.RequestOptions = {
            host: hostname,
            path,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": body.length,
                ...headers
            }
        };

        if (port)
        {
            options.port = +port;
        }

        if (proxy)
        {
            options.agent = new HttpsProxyAgent(proxy);
        }

        const req = https.request(options, (res) =>
        {
            if (res.statusCode === 200)
            {
                let result = "";
                res.on("data", function (chunk)
                {
                    result += chunk;
                });

                res.on("end", function ()
                {
                    resolve(result);
                });
            }
            else
            {
                reject();
            }
        }).on("error", (err) =>
        {
            reject(err);
        });

        req.write(body);
        req.end();
    });
}

/**
 * Download file.
 *
 * @param {string} api The resource url.
 * @param {NodeJS.WritableStream} fs The stream where the file will be wrote;
 * @param {string} [proxy] The proxy settings.
 */
export function downloadFile(api: string, fs: NodeJS.WritableStream, proxy?: string): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        const { hostname, path, port } = url.parse(api);
        const options: https.RequestOptions = {
            host: hostname,
            path
        };

        if (port)
        {
            options.port = +port;
        }

        if (proxy)
        {
            options.agent = new HttpsProxyAgent(proxy);
        }

        fs.on("finish", resolve).on("error", reject);
        https.get(options, (res) =>
        {
            if (res.statusCode === 200)
            {
                res.pipe(fs);
            }
            else
            {
                reject();
            }
        }).on("error", reject);
    });
}
