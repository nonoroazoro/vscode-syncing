import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Syncing } from "../../src/core";

import type { ISyncingSettings } from "../../src/types";

const mocks = vi.hoisted(() => ({
    fs: {
        outputFile: vi.fn(),
        pathExists: vi.fn(),
        readJsonSync: vi.fn()
    },
    logger: {
        error: vi.fn()
    },
    toast: {
        clearSpinner: vi.fn(),
        showGitHubTokenInputBox: vi.fn(),
        showGistInputBox: vi.fn(),
        showRemoteGistListBox: vi.fn(),
        showSpinner: vi.fn(),
        statusError: vi.fn()
    }
}));

vi.mock("fs-extra", () => mocks.fs);

vi.mock("vscode", () => ({
    workspace: {
        getConfiguration: () => ({ get: () => undefined })
    }
}));

vi.mock("../../src/core/Environment", () => ({
    Environment: {
        instance: {
            getUserFilePath: () => "syncing.json"
        }
    }
}));

vi.mock("../../src/core/Logger", () => ({
    Logger: { instance: mocks.logger }
}));

vi.mock("../../src/core/Toast", () => mocks.toast);

vi.mock("../../src/i18n", () => ({
    localize: (key: string, ...values: string[]) => [key, ...values].join(":")
}));

const settings: ISyncingSettings = {
    auto_sync: false,
    id: "existing-gist",
    token: "github-token"
};

describe("Syncing/core/Syncing", () =>
{
    const syncing = Syncing.create();

    beforeEach(() =>
    {
        vi.clearAllMocks();
        vi.stubEnv("HTTP_PROXY", "");
        vi.stubEnv("HTTPS_PROXY", "");
        mocks.fs.outputFile.mockResolvedValue(undefined);
        mocks.fs.readJsonSync.mockReturnValue({});
        mocks.toast.showGitHubTokenInputBox.mockResolvedValue(settings.token);
        mocks.toast.showRemoteGistListBox.mockResolvedValue(settings.id);
    });

    afterEach(() =>
    {
        vi.unstubAllEnvs();
    });

    it("persists a selected gist before upload", async () =>
    {
        await expect(syncing.prepareUploadSettings()).resolves.toEqual(settings);
        expect(mocks.toast.showGitHubTokenInputBox).toHaveBeenCalledWith(true);
        expect(mocks.toast.showRemoteGistListBox).toHaveBeenCalledOnce();
        expect(mocks.fs.outputFile).toHaveBeenCalledWith("syncing.json", expect.any(String));
        const call = mocks.fs.outputFile.mock.calls[0];
        expect(JSON.parse(String(call?.[1]))).toEqual(settings);
    });

    it("rejects when settings cannot be persisted", async () =>
    {
        const error = new Error("disk full");
        mocks.fs.outputFile.mockRejectedValueOnce(error);

        await expect(syncing.saveSettings(settings, true)).rejects.toBe(error);
        expect(mocks.toast.statusError).toHaveBeenCalledWith("toast.syncing.save.settings:disk full");
    });
});
