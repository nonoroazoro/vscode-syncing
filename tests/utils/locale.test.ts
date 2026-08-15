import { describe, expect, it } from "vitest";

import { NormalizedLocale } from "../../src/types";
import { normalize } from "../../src/utils/locale";

describe("Syncing/utils/locale", () =>
{
    it.each([
        [undefined, NormalizedLocale.EN_US],
        ["en-US", NormalizedLocale.EN_US],
        ["zh-cn", NormalizedLocale.ZH_CN],
        ["zh-CN", NormalizedLocale.ZH_CN]
    ])("normalizes %s", (input, expected) =>
    {
        expect(normalize(input)).toBe(expected);
    });
});
