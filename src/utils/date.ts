import rawFormatDistance from "date-fns/esm/formatDistance";
import * as enUS from "date-fns/locale/en-US";
import * as zhCN from "date-fns/locale/zh-CN";

/**
 * Return the distance between the given dates in words.
 *
 * @param {Date} date The date.
 * @param {Date} baseDate The date to compare with.
 * @param {string} locale The locale string, such as `"zh-CN"`, `"en-US"`...
 */
export function formatDistance(date: Date, baseDate: Date, locale?: string)
{
    return rawFormatDistance(date, baseDate, {
        addSuffix: true,
        includeSeconds: true,
        locale: _getLocale(locale)
    });
}

/**
 * Gets the corresponding `Locale` of `date-fns` from the locale string.
 *
 * @param {string} locale The locale string, such as `"zh-CN"`, `"en-US"`...
 */
function _getLocale(locale?: string)
{
    switch (locale)
    {
        case "zh-cn":
        case "zh-CN":
            return zhCN;

        case "en":
        case "en-us":
        case "en-US":
        default:
            return enUS;
    }
}
