import { describe, expect, it } from "vitest";

import { format } from "../../src/utils/template";

describe("Syncing/utils/template", () =>
{
    it("replaces distinct and repeated placeholders", () =>
    {
        expect(format("{0} * {1} is not equal to {0} + {1}", "3", "5"))
            .toBe("3 * 5 is not equal to 3 + 5");
    });
});
