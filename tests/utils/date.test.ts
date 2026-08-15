import { describe, expect, it } from "vitest";

import { NormalizedLocale } from "../../src/types";
import { formatDistance, isAfter, parse } from "../../src/utils/date";

describe("Syncing/utils/date", () =>
{
    it("parses Date, ISO string, and timestamp inputs", () =>
    {
        const target = new Date("2018-01-20T00:00:00.000Z");

        expect(parse(target)).toBe(target);
        expect(parse(target.toISOString())).toEqual(target);
        expect(parse(target.getTime())).toEqual(target);
    });

    it("compares mixed date input types", () =>
    {
        expect(isAfter("2018-12-20", new Date("2018-01-18"))).toBe(true);
        expect(isAfter(new Date("2018-01-18"), "2018-12-20")).toBe(false);
    });

    it.each([
        [NormalizedLocale.EN_US, "2 days ago"],
        [NormalizedLocale.ZH_CN, "2 天前"]
    ])("formats distance for %s", (locale, expected) =>
    {
        expect(formatDistance(new Date("2018-01-18"), new Date("2018-01-20"), locale)).toBe(expected);
    });
});
