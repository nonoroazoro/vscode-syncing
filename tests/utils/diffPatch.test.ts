import { describe, expect, it } from "vitest";

import { diff } from "../../src/utils/diffPatch";

describe("Syncing/utils/diffPatch", () =>
{
    it("ignores reordering when items have stable identities", () =>
    {
        const first = { id: "1", name: "First" };
        const second = { id: "2", name: "Second" };

        expect(diff({ items: [first, second] }, { items: [second, first] })).toBe(0);
    });

    it("counts field modifications instead of item movement", () =>
    {
        const first = { id: "1", name: "First" };
        const second = { id: "2", name: "Second" };
        const changed = { id: "2", name: "Changed" };

        expect(diff({ items: [first, second] }, { items: [changed, first] })).toBe(1);
    });

    it("counts additions, modifications, and deletions", () =>
    {
        const left = { added: undefined, changed: 1, removed: true };
        const right = { added: true, changed: 2 };

        expect(diff(left, right)).toBe(3);
    });

    it("ignores function values", () =>
    {
        expect(diff({ callback: () => 1 }, { callback: () => 2 })).toBe(0);
    });
});
