import { isEmptyString } from "./lang";

// Matches schema, colon and two slashes.
const URL_PREFIX_REGEX = /^(([^:/?#]+):)?\/\//i;

/**
 * Normalizes the Http proxy, fixing protocol.
 */
export function normalizeHttpProxy(proxy: string | undefined)
{
    if (proxy == null || isEmptyString(proxy) || URL_PREFIX_REGEX.test(proxy))
    {
        return proxy;
    }

    // Add HTTP scheme.
    return `http://${proxy}`;
}
