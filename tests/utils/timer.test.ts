import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debounce } from "../../src/utils/timer";

describe("Syncing/utils/timer", () =>
{
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("runs only the latest call and supports cancellation", () =>
    {
        const func = vi.fn();
        const debounced = debounce(func, 100);

        debounced("first");
        vi.advanceTimersByTime(50);
        debounced("latest");
        vi.advanceTimersByTime(100);

        expect(func).toHaveBeenCalledOnce();
        expect(func).toHaveBeenCalledWith("latest");

        debounced("canceled");
        debounced.cancel();
        vi.advanceTimersByTime(100);
        expect(func).toHaveBeenCalledOnce();
    });
});
