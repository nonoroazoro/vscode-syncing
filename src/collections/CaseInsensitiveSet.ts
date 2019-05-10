import { isString } from "../utils/lang";

/**
 * A `case-insensitive` `Set`.
 *
 * All the values are converted to lowercase in a locale-independent fashion.
 *
 * @template T The type of the values in this set.
 */
export class CaseInsensitiveSet<T> extends Set<T>
{
    public add(value: T)
    {
        if (isString(value))
        {
            return super.add(value.toLocaleLowerCase() as any as T);
        }
        return super.add(value);
    }

    public delete(value: T): boolean
    {
        if (isString(value))
        {
            return super.delete(value.toLocaleLowerCase() as any as T);
        }
        return super.delete(value);
    }

    public has(value: T): boolean
    {
        if (isString(value))
        {
            return super.has(value.toLocaleLowerCase() as any as T);
        }
        return super.has(value);
    }
}
