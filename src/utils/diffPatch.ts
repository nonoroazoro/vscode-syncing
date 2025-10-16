/* eslint-disable no-param-reassign */

import { DiffPatcher } from "jsondiffpatch";
import type { Delta } from "jsondiffpatch";

import { isFunction, isObject, isString } from "./lang";

const diffPatcher = new DiffPatcher({
    objectHash(item: string | { id: string; key: string; })
    {
        return isString(item) ? item : (item.id ?? item.key);
    },
    propertyFilter(name, context)
    {
        // Ignore functions.
        return !isFunction((context.left as Record<string, unknown>)[name])
            && !isFunction((context.right as Record<string, unknown>)[name]);
    }
});

/**
 * Calculates the number of differences between the two objects.
 */
export function diff(left: unknown, right: unknown): number
{
    return _countChanges(diffPatcher.diff(left, right));
}

function _countChanges(delta: Delta | undefined, changes = 0)
{
    if (delta == null)
    {
        return changes;
    }

    if (Array.isArray(delta))
    {
        const { length } = delta;
        if (
            length === 1
            || length === 2
            || (length === 3 && delta[2] === 0)
        )
        {
            // Added/Modified/Deleted
            changes++;
        }
        // Ignore array item move.
    }
    else if (isObject(delta))
    {
        Object.keys(delta).forEach(key =>
        {
            // Ignore key "_t".
            if (key !== "_t")
            {
                changes = _countChanges(delta[key], changes);
            }
        });
    }

    return changes;
}
