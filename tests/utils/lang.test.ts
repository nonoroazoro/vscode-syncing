import { describe, expect, it } from "vitest";

import { isEmptyString, isString } from "../../src/utils/lang";

describe("Syncing/utils/lang", () =>
{
    it("recognizes primitive and boxed strings", () =>
    {
        expect(isString("value")).toBe(true);
        expect(isString(Object("value"))).toBe(true);
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
    });

    it("treats only whitespace-only strings as empty", () =>
    {
        expect(isEmptyString(" \t\n")).toBe(true);
        expect(isEmptyString(" value ")).toBe(false);
        expect(isEmptyString([])).toBe(false);
        expect(isEmptyString(null)).toBe(false);
    });
});
