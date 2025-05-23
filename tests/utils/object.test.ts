import { pick } from "../../src/utils/object";

describe("Syncing/utils/object", () =>
{
    it("pick", () =>
    {
        const obj = { a: 1, b: 2, c: 3 };
        const keys = ["a", "b", "d"];
        expect(pick(obj, keys)).toEqual({ a: 1, b: 2 });
    });
});
