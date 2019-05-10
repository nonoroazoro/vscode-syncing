import
{
    formatDistance as rawFormatDistance,
    isAfter as rawIsAfter,
    parseISO
} from "date-fns";
import * as enUS from "date-fns/locale/en-US";
import * as zhCN from "date-fns/locale/zh-CN";

import { NormalizedLocale } from "../types/NormalizedLocale";
import { isDate, isString } from "./lang";

/**
 * Parses the given value and returns the `Date` the input value represents.
 *
 * @param {(Date | number | string)} input The input value.
 */
export function parse(input: Date | number | string): Date
{
    if (isDate(input))
    {
        return input;
    }
    if (isString(input))
    {
        return parseISO(input);
    }
    return new Date(input);
}

/**
 * Checks if the first date is after the base date.
 *
 * @param {(Date | number | string)} date The first date.
 * @param {(Date | number | string)} baseDate The date to compare with.
 */
export function isAfter(date: Date | number | string, baseDate: Date | number | string)
{
    return rawIsAfter(parse(date), parse(baseDate));
}

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
