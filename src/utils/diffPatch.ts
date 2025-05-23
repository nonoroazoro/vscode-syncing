import { DiffPatcher } from "jsondiffpatch";
import type { Delta } from "jsondiffpatch";

import { isFunction, isObject, isString } from "./lang";

const diffPatcher = new DiffPatcher({
    objectHash(item)
    {
        return isString(item) ? item : (item.id ?? item.key)
    },
    propertyFilter(name, context)
    {
        // Ignore functions.
        return !isFunction(context.left[name]) && !isFunction(context.right[name]);
    }
});

/**
 * Calculates the number of differences between the two objects.
 */
export function diff(left: any, right: any): number
{
    return _countChanges(diffPatcher.diff(left, right));
}

function _countChanges(delta: Delta | undefined, changes = 0)
{
    if (delta == null) { return changes; }

    if (Array.isArray(delta))
    {
        const { length } = delta;
        if (
            length === 1
            || length === 2
            || length === 3 && delta[2] === 0
        )
        {
            // Added/Modified/Deleted
            changes++;
        }
        // Ignore array item move.
    }
    else if (isObject(delta))
    {
        for (const key in delta)
        {
            // Ignore the "_t" key.
            if (key !== '_t')
            {
                changes = _countChanges(delta[key], changes);
            }
        }
    }

    return changes;
}
