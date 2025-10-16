/* eslint-disable prefer-object-has-own */

/**
 * Creates an object composed of the picked object properties, like `lodash.pick`.
 */
export function pick<T extends Pick<T, K>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>
{
    return keys.reduce((acc, key) =>
    {
        if (Object.prototype.hasOwnProperty.call(obj, key))
        {
            acc[key] = obj[key];
        }
        return acc;
    }, {} as Pick<T, K>);
}
