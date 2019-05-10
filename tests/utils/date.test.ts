import { NormalizedLocale } from "../../src/types/NormalizedLocale";
import { formatDistance, isAfter, parse } from "../../src/utils/date";

describe("Syncing/utils/date", () =>
{
    it("parse date", () =>
    {
        const target = new Date();
        const str = target.toISOString();
        const time = target.getTime();
        expect(parse(str)).toEqual(target);
        expect(parse(time)).toEqual(target);
    });

    it("format distance of dates in Default Locale", () =>
    {
        const target = "2 days ago";
        const date = new Date("2018-01-18");
        const baseDate = new Date("2018-01-20");
        expect(formatDistance(date, baseDate)).toEqual(target);
    });

    it("format distance of dates in English", () =>
    {
        const target = "2 days ago";
        const date = new Date("2018-01-18");
        const baseDate = new Date("2018-01-20");
        expect(formatDistance(date, baseDate, NormalizedLocale.EN_US)).toEqual(target);
    });

    it("format distance of dates in Simplified Chinese", () =>
    {
        const target = "2 天前";
        const date = new Date("2018-01-18");
        const baseDate = new Date("2018-01-20");
        expect(formatDistance(date, baseDate, NormalizedLocale.ZH_CN)).toEqual(target);
    });

    it("isAfter: false", () =>
    {
        const date = new Date("2018-01-18");
        const baseDate = "2018-12-20";
        expect(isAfter(date, baseDate)).toEqual(false);
    });

    it("isAfter: true", () =>
    {
        const date = "2018-12-20";
        const baseDate = new Date("2018-01-18");
        expect(isAfter(date, baseDate)).toEqual(true);
    });
});
