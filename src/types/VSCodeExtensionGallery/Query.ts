import type { QueryFilter } from "./QueryFilter";
import type { QueryFlag } from "./QueryFlag";

export interface Query
{
    /**
     * Each filter is a unique query and will have matching set of extensions returned from the request.
     *
     * Each result will have the same index in the resulting array that the filter had in the incoming query.
     */
    filters: QueryFilter[];

    /**
     * The Flags are used to determine which set of information the caller would like returned for the matched extensions.
     *
     * Bitwise flags {@link QueryFlag}.
     */
    flags: QueryFlag | number;
}
