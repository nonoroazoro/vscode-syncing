import { describe, expect, it, vi } from "vitest";

import { excludeSettings, mergeSettings, parse } from "../../src/utils/jsonc";

vi.mock("vscode", () => ({}));

describe("Syncing/utils/jsonc", () =>
{
    it("removes excluded settings without changing unrelated settings", () =>
    {
        const source = `{
            // Keep comments valid while editing JSONC.
            "editor.fontSize": 16,
            "workbench.colorTheme": "Remote"
        }`;

        expect(parse(excludeSettings(source, parse(source) as JSONObject, ["editor.*"]))).toEqual({
            "workbench.colorTheme": "Remote"
        });
    });

    it("preserves local excluded settings when remote settings are merged", () =>
    {
        const remote = JSON.stringify({
            "editor.fontSize": 16,
            "syncing.excludedSettings": ["editor.*", "terminal.integrated.fontSize"],
            "terminal.integrated.fontSize": 14,
            "workbench.colorTheme": "Remote"
        });
        const local = JSON.stringify({
            "editor.fontSize": 12,
            "workbench.colorTheme": "Local"
        });

        expect(parse(mergeSettings(remote, local))).toEqual({
            "editor.fontSize": 12,
            "syncing.excludedSettings": ["editor.*", "terminal.integrated.fontSize"],
            "workbench.colorTheme": "Remote"
        });
    });
});
