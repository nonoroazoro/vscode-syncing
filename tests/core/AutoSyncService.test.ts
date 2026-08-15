import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutoSyncService } from "../../src/core";
import { SettingType } from "../../src/types";

import type { IGist, ISetting, ISyncingSettings } from "../../src/types";

const mocks = vi.hoisted(() => ({
    api: {
        get: vi.fn(),
        getModifiedFiles: vi.fn()
    },
    executeCommand: vi.fn(),
    settings: {
        getLastModified: vi.fn(),
        getSettings: vi.fn()
    },
    toast: {
        clearSpinner: vi.fn(),
        showSpinner: vi.fn(),
        statusError: vi.fn(),
        statusInfo: vi.fn()
    },
    watcher: {
        on: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
    }
}));

vi.mock("vscode", () => ({
    commands: { executeCommand: mocks.executeCommand }
}));

vi.mock("../../src/core/Gist", () => ({
    Gist: { create: () => mocks.api }
}));

vi.mock("../../src/core/Toast", () => mocks.toast);

vi.mock("../../src/core/VSCodeSetting", () => ({
    VSCodeSetting: { create: () => mocks.settings }
}));

vi.mock("../../src/i18n", () => ({
    localize: (key: string, ...values: string[]) => [key, ...values].join(":")
}));

vi.mock("../../src/watcher", () => ({
    SettingsWatcherService: class
    {
        public on = mocks.watcher.on;
        public pause = mocks.watcher.pause;
        public resume = mocks.watcher.resume;
        public start = mocks.watcher.start;
        public stop = mocks.watcher.stop;
    },
    WatcherEvent: { ALL: "all" }
}));

const localSettings: ISetting[] = [{
    content: '{"editor.fontSize": 16}',
    lastModified: Date.parse("2026-08-15T01:00:00Z"),
    localFilePath: "/user/settings.json",
    remoteFilename: "settings.json",
    type: SettingType.Settings
}];

const remoteSettings: IGist = {
    description: "VSCode's Settings - Syncing",
    files: {
        "settings.json": {
            content: '{"editor.fontSize": 14}',
            filename: "settings.json"
        }
    },
    history: [],
    id: "existing-gist",
    owner: {
        id: 1,
        login: "owner"
    },
    public: false,
    updated_at: "2026-08-15T00:00:00Z"
};

const syncingSettings: ISyncingSettings = {
    auto_sync: true,
    id: remoteSettings.id,
    token: "github-token"
};

describe("Syncing/core/AutoSyncService", () =>
{
    const service = AutoSyncService.create();

    beforeEach(() =>
    {
        vi.clearAllMocks();
        mocks.settings.getSettings.mockResolvedValue(localSettings);
        mocks.settings.getLastModified.mockReturnValue(localSettings[0]?.lastModified);
        mocks.api.get.mockResolvedValue(remoteSettings);
        mocks.api.getModifiedFiles.mockReturnValue({ "settings.json": { content: "changed" } });
    });

    it.each([
        [Date.parse("2026-08-15T01:00:00Z"), "syncing.uploadSettings"],
        [Date.parse("2026-08-14T23:00:00Z"), "syncing.downloadSettings"]
    ])("selects the correct direction from modification times", async (localLastModified, command) =>
    {
        mocks.settings.getLastModified.mockReturnValue(localLastModified);

        await service.synchronize(syncingSettings);

        expect(mocks.executeCommand).toHaveBeenCalledOnce();
        expect(mocks.executeCommand).toHaveBeenCalledWith(command);
    });

    it("does not synchronize unchanged settings", async () =>
    {
        mocks.api.getModifiedFiles.mockReturnValue(undefined);

        await service.synchronize(syncingSettings);

        expect(mocks.executeCommand).not.toHaveBeenCalled();
        expect(mocks.toast.clearSpinner).toHaveBeenCalledWith("");
        expect(mocks.toast.statusInfo).toHaveBeenCalledWith("toast.settings.autoSync.nothingChanged");
    });

    it("reports failures without starting a destructive command", async () =>
    {
        mocks.api.get.mockRejectedValue(new Error("offline"));

        await service.synchronize(syncingSettings);

        expect(mocks.executeCommand).not.toHaveBeenCalled();
        expect(mocks.toast.statusError).toHaveBeenCalledWith("toast.settings.autoSync.failed:offline");
    });
});
