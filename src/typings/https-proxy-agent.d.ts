// See https://stackoverflow.com/questions/44058101/typescript-declare-third-party-modules#44060120
declare module "https-proxy-agent"
{
    import { Agent } from "http";

    class HttpsProxyAgent extends Agent
    {
        constructor(proxy: string);
    }

    namespace HttpsProxyAgent { }

    export = HttpsProxyAgent;
}
