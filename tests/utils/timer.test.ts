import { debounce } from "../../src/utils/timer";

jest.useFakeTimers();

describe("Syncing/utils/timer", () =>
{
    it("debounce", () =>
    {
        const func = jest.fn();
        const debounced = debounce(func, 100);
        expect(func).not.toHaveBeenCalled();

        debounced();
        jest.advanceTimersByTime(10);

        expect(func).not.toHaveBeenCalled();
        debounced();

        jest.advanceTimersByTime(10);
        expect(func).not.toHaveBeenCalled();

        jest.advanceTimersByTime(100);
        expect(func).toHaveBeenCalled();
    });
});
