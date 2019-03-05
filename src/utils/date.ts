import { formatDistance as rawFormatDistance } from "date-fns";
import * as enUS from "date-fns/locale/en-US";
import * as zhCN from "date-fns/locale/zh-CN";

import { NormalizedLocale } from "../types/NormalizedLocale";

/**
 * Return the distance between the given dates in words.
 *
 * @param {Date} date The date.
 * @param {Date} baseDate The date to compare with.
 * @param {NormalizedLocale} [locale] The normalized locale.
 */
export function formatDistance(date: Date, baseDate: Date, locale?: NormalizedLocale)
{
    return rawFormatDistance(
        date,
        baseDate,
        {
            addSuffix: true,
            includeSeconds: true,
            locale: _getDateLocale(locale)
        }
    );
}

/**
 * Gets the `Locale` of `date-fns` corresponding to the normalied locale.
 */
function _getDateLocale(locale?: NormalizedLocale)
{
    switch (locale)
    {
        case NormalizedLocale.ZH_CN:
            return zhCN;

        case NormalizedLocale.EN_US:
        default:
            return enUS;
    }
}
