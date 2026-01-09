import { DiffPatcher } from "jsondiffpatch";
import type {
    AddedDelta,
    ArrayDelta,
    DeletedDelta,
    Delta,
    ModifiedDelta,
    MovedDelta,
    ObjectDelta,
    TextDiffDelta
} from "jsondiffpatch";

import { isFunction } from "./lang";

const diffPatcher = new DiffPatcher({
    objectHash(item)
    {
        const obj = item as { id?: string; key?: string; };
        return obj.id ?? obj.key;
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

function _countChanges(delta: Delta): number
{
    if (_isMovedDelta(delta))
    {
        return 0;
    }

    if (_isAddedDelta(delta) || _isModifiedDelta(delta) || _isDeletedDelta(delta) || _isTextDiffDelta(delta))
    {
        return 1;
    }

    if (_isObjectDelta(delta))
    {
        return Object.values(delta).reduce((count, value) => count + _countChanges(value), 0);
    }

    if (_isArrayDelta(delta))
    {
        return Object.keys(delta)
            .filter(key => key !== "_t")
            .reduce((count, key) => count + _countChanges(delta[key as unknown as number]), 0);
    }

    return 0;
}

function _isAddedDelta(delta: Delta): delta is AddedDelta
{
    return Array.isArray(delta) && delta.length === 1;
}

function _isModifiedDelta(delta: Delta): delta is ModifiedDelta
{
    return Array.isArray(delta) && delta.length === 2;
}

function _isDeletedDelta(delta: Delta): delta is DeletedDelta
{
    return Array.isArray(delta) && delta.length === 3 && delta[1] === 0 && delta[2] === 0;
}

function _isMovedDelta(delta: Delta): delta is MovedDelta
{
    return Array.isArray(delta) && delta.length === 3 && delta[2] === 3;
}

function _isTextDiffDelta(delta: Delta): delta is TextDiffDelta
{
    return Array.isArray(delta) && delta.length === 3 && delta[2] === 2;
}

function _isObjectDelta(delta: Delta): delta is ObjectDelta
{
    return delta !== undefined && typeof delta === "object" && !Array.isArray(delta);
}

function _isArrayDelta(delta: Delta): delta is ArrayDelta
{
    return delta !== undefined && typeof delta === "object" && "_t" in delta && delta._t === "a";
}
