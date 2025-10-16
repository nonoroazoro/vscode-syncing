/**
 * Checks if the input is an object.
 */
export function isObject(input: unknown): input is object
{
    return Object.prototype.toString.call(input) === "[object Object]";
}

/**
 * Checks if the input value is a `String` primitive or object.
 */
export function isString(input: unknown): input is string
{
    return (typeof input === "string" || input instanceof String);
}

/**
 * Checks if the input value is a `Date` object.
 */
export function isDate(input: unknown): input is Date
{
    return input instanceof Date;
}

/**
 * Checks if the input value is an `empty` string.
 */
export function isEmptyString(input: unknown): boolean
{
    if (isString(input))
    {
        return input.trim() === "";
    }
    return false;
}

/**
 * Checks if the input value is a `Function`.
 */
export function isFunction(input: unknown): input is (...args: unknown[]) => unknown
{
    return typeof input === "function";
}
