import type { QueryFilterType } from "./QueryFilterType";
import type { SortBy } from "./SortBy";
import type { SortOrder } from "./SortOrder";

export interface QueryFilter
{
    criteria: Array<{ filterType: QueryFilterType; value?: string; }>;

    pageNumber?: number; // default: 1
    pageSize?: number; // default: 10

    sortBy?: SortBy; // default: 0
    sortOrder?: SortOrder; // default: 0
}
