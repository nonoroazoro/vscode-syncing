import { DiffPatcher } from "jsondiffpatch";

const diffPatcher = new DiffPatcher({ objectHash(obj: any) { return obj.id || obj.key; } });

/**
 * Calculates the number of differences between the two objects.
 */
export function diff(left: any, right: any): number
{
    const result = diffPatcher.diff(left, right);
    if (result)
    {
        let value: any;
        // Filter out the "_t" key.
        return Object.keys(result).filter((key) => (key !== "_t")).reduce((prev, cur) =>
        {
            value = result[cur];
            if (value != null)
            {
                if (Array.isArray(value))
                {
                    // Filter out the keys of the items moved inside the array.
                    if (!_isArrayItemMoved(value))
                    {
                        return prev++;
                    }
                }
                else
                {
                    // Filter out the "_t" key and the keys of the items moved inside the array.
                    return prev + Object.keys(value).filter((key) =>
                    {
                        return (key !== "_t") && !_isArrayItemMoved(value[key]);
                    }).length;
                }
            }
            return prev;
        }, 0);
    }
    return 0;
}

/**
 * Detects if the value represents the item moved inside the array.
 * See https://github.com/benjamine/jsondiffpatch/issues/79#issuecomment-250468970.
 */
function _isArrayItemMoved(value: any)
{
    return Array.isArray(value) && value[2] === 3;
}
