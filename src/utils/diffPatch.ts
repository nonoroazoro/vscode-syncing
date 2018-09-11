import { DiffPatcher } from "jsondiffpatch";

/**
 * Note that the items moved inside the array are ignored.
 */
const diffPatcher = new DiffPatcher({
    objectHash(obj: any)
    {
        return obj.id || obj.key;
    },
    arrays:
    {
        detectMove: false
    }
});

/**
 * Calculates the number of differences between the two objects.
 */
export function diff(left: any, right: any): number
{
    const result = diffPatcher.diff(left, right);
    if (result)
    {
        let value: any;
        return Object.keys(result).reduce((prev, cur) =>
        {
            value = result[cur];
            if (value)
            {
                // Filter out the "_t" key.
                return prev + Object.keys(result[cur]).filter((key) => (key !== "_t")).length;
            }
            else
            {
                return prev;
            }
        }, 0);
    }
    return 0;
}
