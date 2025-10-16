import { NormalizedLocale } from "../types";

/**
 * Normalizes the locale string.
 *
 * @param {string} [locale] The locale string, such as `"zh-CN"`, `"en-US"`...
 */
export function normalize(locale?: string): NormalizedLocale
{
    if (locale == null)
    {
        return NormalizedLocale.EN_US;
    }

    switch (locale)
    {
        case "zh-cn":
        case "zh-CN":
            return NormalizedLocale.ZH_CN;

        case "en":
        case "en-us":
        case "en-US":
        default:
            return NormalizedLocale.EN_US;
    }
}
