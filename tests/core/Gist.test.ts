import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SNIPPET_FILE_PREFIX } from "../../src/constants";
import { Gist } from "../../src/core";
import { SettingType } from "../../src/types";

import type { IGist, IGistFiles, ISetting } from "../../src/types";

vi.mock("vscode", () => ({
    workspace: {
        getConfiguration: () => ({ get: () => undefined })
    }
}));

vi.mock("../../src/i18n", () => ({
    localize: (key: string, ...values: string[]) => [key, ...values].join(":")
}));

const gist: IGist = {
    description: "VSCode's Settings - Syncing",
    files: {},
    history: [],
    id: "existing-gist",
    owner: {
        id: 1,
        login: "owner"
    },
    public: false,
    updated_at: "2026-08-15T00:00:00Z"
};

const settings: ISetting = {
    content: '{"editor.fontSize": 16}',
    localFilePath: "/user/settings.json",
    remoteFilename: "settings.json",
    type: SettingType.Settings
};

let tokenID = 0;

describe("Syncing/core/Gist", () =>
{
    let api: Gist;

    beforeEach(() =>
    {
        vi.useFakeTimers();
        vi.stubEnv("HTTP_PROXY", "");
        vi.stubEnv("HTTPS_PROXY", "");
        tokenID += 1;
        api = Gist.create(`token-${tokenID}`);
    });

    afterEach(() =>
    {
        vi.restoreAllMocks();
        vi.useRealTimers();
        vi.unstubAllEnvs();
    });

    describe("exists", () =>
    {
        it("returns false immediately for a missing gist", async () =>
        {
            const get = vi.spyOn(api, "get")
                .mockRejectedValue(Object.assign(new Error("Not Found"), { code: 404 }));

            await expect(api.exists(gist.id)).resolves.toBe(false);
            expect(get).toHaveBeenCalledOnce();
        });

        it("uses exponential backoff for transient errors", async () =>
        {
            const error = Object.assign(new Error("Service Unavailable"), { code: 503 });
            const get = vi.spyOn(api, "get")
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error)
                .mockResolvedValue(gist);

            const result = expect(api.exists(gist.id)).resolves.toBe(gist);
            expect(get).toHaveBeenCalledOnce();

            await vi.advanceTimersByTimeAsync(249);
            expect(get).toHaveBeenCalledOnce();
            await vi.advanceTimersByTimeAsync(1);
            expect(get).toHaveBeenCalledTimes(2);

            await vi.advanceTimersByTimeAsync(499);
            expect(get).toHaveBeenCalledTimes(2);
            await vi.advanceTimersByTimeAsync(1);
            await result;
            expect(get).toHaveBeenCalledTimes(3);
        });

        it.each([401, 403, 422])("does not retry HTTP %i", async code =>
        {
            const error = Object.assign(new Error("Request Rejected"), { code });
            const get = vi.spyOn(api, "get").mockRejectedValue(error);

            await expect(api.exists(gist.id)).rejects.toBe(error);
            expect(get).toHaveBeenCalledOnce();
        });
    });

    describe("findAndUpdate", () =>
    {
        it("returns the existing gist when files are unchanged", async () =>
        {
            const existing = {
                ...gist,
                files: {
                    [settings.remoteFilename]: {
                        content: settings.content ?? "",
                        filename: settings.remoteFilename
                    }
                }
            };
            vi.spyOn(api, "exists").mockResolvedValue(existing);
            const update = vi.spyOn(api, "update");
            const createSettings = vi.spyOn(api, "createSettings");

            await expect(api.findAndUpdate(gist.id, [settings])).resolves.toBe(existing);
            expect(update).not.toHaveBeenCalled();
            expect(createSettings).not.toHaveBeenCalled();
        });

        it("updates only modified files in the existing gist", async () =>
        {
            const existing = {
                ...gist,
                files: {
                    [settings.remoteFilename]: {
                        content: '{"editor.fontSize": 14}',
                        filename: settings.remoteFilename
                    }
                }
            };
            vi.spyOn(api, "exists").mockResolvedValue(existing);
            const update = vi.spyOn(api, "update").mockResolvedValue(gist);

            await expect(api.findAndUpdate(gist.id, [settings])).resolves.toBe(gist);
            expect(update).toHaveBeenCalledWith({
                files: {
                    [settings.remoteFilename]: { content: settings.content }
                },
                gist_id: gist.id
            });
        });

        it("creates a settings gist only after GitHub returns 404", async () =>
        {
            vi.spyOn(api, "get")
                .mockRejectedValue(Object.assign(new Error("Not Found"), { code: 404 }));
            const createSettings = vi.spyOn(api, "createSettings").mockResolvedValue(gist);

            await expect(api.findAndUpdate(gist.id, [settings])).resolves.toBe(gist);
            expect(createSettings).toHaveBeenCalledWith({
                [settings.remoteFilename]: { content: settings.content }
            });
        });

        it("never creates a gist after transient errors are exhausted", async () =>
        {
            const error = Object.assign(new Error("Service Unavailable"), { code: 503 });
            const get = vi.spyOn(api, "get").mockRejectedValue(error);
            const createSettings = vi.spyOn(api, "createSettings");

            const result = expect(api.findAndUpdate(gist.id, [])).rejects.toBe(error);
            await vi.runAllTimersAsync();
            await result;
            expect(get).toHaveBeenCalledTimes(3);
            expect(createSettings).not.toHaveBeenCalled();
        });
    });

    it("updates and deletes only files managed by the local scope", () =>
    {
        const localSettings: ISetting[] = [
            {
                content: '{"changed": true}',
                localFilePath: "/user/settings.json",
                remoteFilename: "settings.json",
                type: SettingType.Settings
            },
            {
                localFilePath: "/extensions",
                remoteFilename: "extensions.json",
                type: SettingType.Extensions
            },
            {
                content: "",
                localFilePath: "/user/snippets/empty.json",
                remoteFilename: "snippet-empty.json",
                type: SettingType.Snippets
            }
        ];
        const remoteFiles: IGistFiles = {
            "extensions.json": { content: "[]", filename: "extensions.json" },
            "keybindings-linux.json": { content: "[]", filename: "keybindings-linux.json" },
            "remote-extensions.json": { content: "[]", filename: "remote-extensions.json" },
            "settings.json": { content: '{"changed": false}', filename: "settings.json" },
            "snippet-old.json": { content: "old", filename: "snippet-old.json" },
            "unmanaged.json": { content: "keep", filename: "unmanaged.json" }
        };

        expect(api.getModifiedSettings(localSettings, remoteFiles, [SNIPPET_FILE_PREFIX])).toEqual({
            "extensions.json": null,
            "settings.json": { content: '{"changed": true}' },
            "snippet-empty.json": { content: "" },
            "snippet-old.json": null
        });
    });

    it("preserves local and unmanaged files while updating the remote scope", () =>
    {
        const remoteScopeSettings: ISetting[] = [
            {
                localFilePath: "/server/data/Machine/settings.json",
                remoteFilename: "remote-settings.json",
                type: SettingType.Settings
            },
            {
                content: "[]",
                localFilePath: "/server/extensions",
                remoteFilename: "remote-extensions.json",
                type: SettingType.Extensions
            }
        ];
        const remoteFiles: IGistFiles = {
            "extensions.json": { content: "[]", filename: "extensions.json" },
            "remote-extensions.json": { content: "[]", filename: "remote-extensions.json" },
            "remote-settings.json": { content: "{}", filename: "remote-settings.json" },
            "settings.json": { content: "{}", filename: "settings.json" },
            "snippet-local.json": { content: "keep", filename: "snippet-local.json" },
            "unmanaged.json": { content: "keep", filename: "unmanaged.json" }
        };

        expect(api.getModifiedSettings(remoteScopeSettings, remoteFiles)).toEqual({
            "remote-settings.json": null
        });
    });
});
