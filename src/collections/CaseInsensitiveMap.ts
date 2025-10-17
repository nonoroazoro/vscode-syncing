/**
 * A case-insensitive Map.
 *
 * All keys are normalized to lowercase in a locale-independent fashion.
 *
 * @template V The type of the values in this map.
 */
export class CaseInsensitiveMap<V> extends Map<string, V>
{
    public delete(key: string): boolean
    {
        return super.delete(this._normalizeKey(key));
    }

    public get(key: string): V | undefined
    {
        return super.get(this._normalizeKey(key));
    }

    public has(key: string): boolean
    {
        return super.has(this._normalizeKey(key));
    }

    public set(key: string, value: V): this
    {
        return super.set(this._normalizeKey(key), value);
    }

    private _normalizeKey(key: string)
    {
        return key.toLocaleLowerCase();
    }
}
