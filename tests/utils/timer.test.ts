import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debounce } from "../../src/utils/timer";

describe("Syncing/utils/timer", () =>
{
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("debounce", () =>
    {
        const func = vi.fn();
        const debounced = debounce(func, 100);
        expect(func).not.toHaveBeenCalled();

        debounced();
        vi.advanceTimersByTime(10);

        expect(func).not.toHaveBeenCalled();
        debounced();

        vi.advanceTimersByTime(10);
        expect(func).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(func).toHaveBeenCalled();
    });
});
