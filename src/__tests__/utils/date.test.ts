import { NormalizedLocale } from "../../types/NormalizedLocale";
import { formatDistance } from "../../utils/date";

describe("Syncing/utils/date", () =>
{
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
});
