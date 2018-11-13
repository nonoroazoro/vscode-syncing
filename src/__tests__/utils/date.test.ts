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
        const locales = ["en", "en-US", "en-us", ""];
        const target = "2 days ago";
        const date = new Date("2018-01-18");
        const baseDate = new Date("2018-01-20");
        locales.forEach((locale) =>
        {
            expect(formatDistance(date, baseDate, locale)).toEqual(target);
        });
    });

    it("format distance of dates in Simplified Chinese", () =>
    {
        const locales = ["zh-cn", "zh-CN"];
        const target = "2 天前";
        const date = new Date("2018-01-18");
        const baseDate = new Date("2018-01-20");
        locales.forEach((locale) =>
        {
            expect(formatDistance(date, baseDate, locale)).toEqual(target);
        });
    });
});
