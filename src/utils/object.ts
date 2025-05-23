/**
 * Creates an object composed of the picked object properties, like `lodash.pick`.
 */
export function pick<T extends Record<string, any>, K extends keyof T>(obj: T, keys: (K | string)[]): Pick<T, K>
{
    return keys.reduce((acc, key) =>
    {
        if (Object.prototype.hasOwnProperty.call(obj, key))
        {
            acc[key] = obj[key];
        }
        return acc;
    }, {} as any);
}
