import { diff } from "../../utils/diffPatch";

describe("Syncing/utils/diffPatch", () =>
{
    it("moving items inside the array should not lead diffs", () =>
    {
        const left = [
            {
                id: "1",
                name: "Item1"
            },
            {
                id: "2",
                name: "Item2"
            }
        ];
        const right = [...left].reverse();
        expect(diff(left, right)).toBe(0);
    });

    it("moving items inside the array should not lead diffs", () =>
    {
        const left = {
            items: [
                {
                    id: "1",
                    name: "Item1"
                },
                {
                    id: "2",
                    name: "Item2"
                }
            ]
        };
        const right = {
            items: [...left.items].reverse()
        };
        expect(diff(left, right)).toBe(0);
    });
});
