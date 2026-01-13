import { describe, expect, it } from "vitest";

import { isEmptyString, isString } from "../../src/utils/lang";

describe("Syncing/utils/lang", () =>
{
    it("is a string", () =>
    {
        expect(isString("date")).toBe(true);
        expect(isString("123")).toBe(true);
        expect(isString("*@#!@#")).toBe(true);
        expect(isString("date")).toBe(true);
        expect(isString(String(123))).toBe(true);
        expect(isString("*@#!@#")).toBe(true);
    });

    it("is not a string", () =>
    {
        expect(isString({})).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString(123)).toBe(false);
        expect(isString(NaN)).toBe(false);
        expect(isString(() =>
        {})).toBe(false);
    });

    it("is an empty string", () =>
    {
        expect(isEmptyString("")).toBe(true);
        expect(isEmptyString(" ")).toBe(true);
        expect(isEmptyString("  ")).toBe(true);
    });

    it("is not an empty string", () =>
    {
        expect(isEmptyString(" a ")).toBe(false);
        expect(isEmptyString(" 1 ")).toBe(false);
        expect(isEmptyString([])).toBe(false);
        expect(isEmptyString({})).toBe(false);
        expect(isEmptyString(null)).toBe(false);
        expect(isEmptyString(undefined)).toBe(false);
    });
});
