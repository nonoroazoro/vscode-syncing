import { DiffPatcher } from "jsondiffpatch";

const diffPatcher = new DiffPatcher({ objectHash(obj: any) { return obj.id; } });

/**
 * Calculates the number of differences between the two objects.
 */
export function diff(left: any, right: any): number
{
    const result = diffPatcher.diff(left, right);
    if (result)
    {
        return Object.keys(result).reduce((prev, cur) =>
        {
            // Filter out the "_t" key.
            return prev + Object.keys(result[cur]).filter((key) => (key !== "_t")).length;
        }, 0);
    }
    return 0;
}
