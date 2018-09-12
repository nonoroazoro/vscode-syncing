import { diff } from "../../utils/diffPatch";

describe("Syncing/utils/diffPatch", () =>
{
    it("moving items inside the array should not lead diffs", () =>
    {
        const item1 = { id: "1", name: "Item1" };
        const item2 = { id: "2", name: "Item2" };

        const left = [item1, item2];
        const right = [item2, item1];
        expect(diff(left, right)).toBe(0);
    });

    it("moving items inside the array should not lead diffs", () =>
    {
        const item1 = { id: "1", name: "Item1" };
        const item2 = { id: "2", name: "Item2" };

        const left = { items: [item1, item2] };
        const right = { items: [item2, item1] };
        expect(diff(left, right)).toBe(0);
    });

    it("change items inside the array should lead diffs", () =>
    {
        const item1 = { id: "1", name: "Item1" };
        const item2 = { id: "2", name: "Item2" };
        const item2Change = { id: "2", name: "ItemChanged" };

        const left = [item1, item2];
        const right = [item2Change, item1];
        expect(diff(left, right)).toBe(1);
    });

    it("change items inside the array should lead diffs", () =>
    {
        const item1 = { id: "1", name: "Item1" };
        const item2 = { id: "2", name: "Item2" };
        const item2Change = { id: "2", name: "ItemChanged" };

        const left = { items: [item1, item2] };
        const right = { items: [item2Change, item1] };
        expect(diff(left, right)).toBe(1);
    });

    it("normal diff (Record)", () =>
    {
        const left = { id: "1", name: "Item1" };
        const right = { id: "2", name: "Item2" };
        expect(diff(left, right)).toBe(2);
    });

    it("normal diff (Array)", () =>
    {
        const left = [{ id: "1", name: "Item1" }, { id: "2", name: "Item2" }, { id: "3", name: "Item3" }];
        const right = [{ id: "3", name: "Item3" }, { id: "1", name: "Item2" }, { id: "2", name: "Item1" }];
        expect(diff(left, right)).toBe(2);
    });
});
