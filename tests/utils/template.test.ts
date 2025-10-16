import { format } from "../../src/utils/template";

describe("Syncing/utils/template", () =>
{
    it("replace single template with values", () =>
    {
        const template = "Hello {0}!";
        const values = ["Jack"];
        const target = "Hello Jack!";
        expect(format(template, ...values)).toBe(target);
    });

    it("replace unique templates with values", () =>
    {
        const template = "Hello {0} and {1}!";
        const values = ["Jack", "Rose"];
        const target = "Hello Jack and Rose!";
        expect(format(template, ...values)).toBe(target);
    });

    it("replace multiple templates with values", () =>
    {
        const template = "{0} * {1} is not equal to {0} + {1}";
        const values = ["3", "5"];
        const target = "3 * 5 is not equal to 3 + 5";
        expect(format(template, ...values)).toBe(target);
    });
});
