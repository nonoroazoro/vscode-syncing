/**
 * Checks if the input value is a `Date` object.
 */
export function isDate(input: any): input is Date
{
    return (input instanceof Date);
}

/**
 * Checks if the input value is an `empty` string.
 */
export function isEmptyString(input: any): boolean
{
    if (isString(input))
    {
        return input.trim() === "";
    }
    return false;
}

/**
 * Checks if the input value is a `String` primitive or object.
 */
export function isString(input: any): input is string
{
    return (typeof input === "string" || input instanceof String);
}
