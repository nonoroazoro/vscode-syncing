import { beforeEach, describe, expect, it, vi } from "vitest";

import { AutoSyncService } from "../../src/core";
import { SettingType } from "../../src/types";

import type { IGist, ISetting, ISyncingSettings } from "../../src/types";

const mocks = vi.hoisted(() => ({
    api: {
        get: vi.fn(),
        getModifiedSettings: vi.fn()
    },
    executeCommand: vi.fn(),
    settings: {
        getLastModified: vi.fn(),
        getSettings: vi.fn(),
        managedGistFilePrefixes: ["snippet-"]
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
        mocks.settings.managedGistFilePrefixes = ["snippet-"];
        mocks.api.get.mockResolvedValue(remoteSettings);
        mocks.api.getModifiedSettings.mockReturnValue({ "settings.json": { content: "changed" } });
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
        mocks.api.getModifiedSettings.mockReturnValue(undefined);

        await service.synchronize(syncingSettings);

        expect(mocks.executeCommand).not.toHaveBeenCalled();
        expect(mocks.api.getModifiedSettings).toHaveBeenCalledWith(
            localSettings,
            remoteSettings.files,
            mocks.settings.managedGistFilePrefixes
        );
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

    it("uploads when a Remote scope file is missing regardless of timestamps", async () =>
    {
        const remoteScopeSettings: ISetting[] = [{
            ...localSettings[0],
            localFilePath: "/server/data/Machine/settings.json",
            remoteFilename: "remote-settings.json"
        }];
        mocks.settings.getSettings.mockResolvedValue(remoteScopeSettings);
        mocks.settings.getLastModified.mockReturnValue(Date.parse("2026-08-14T23:00:00Z"));
        mocks.settings.managedGistFilePrefixes = [];
        mocks.api.get.mockResolvedValue({ ...remoteSettings, files: {} });

        await service.synchronize(syncingSettings);

        expect(mocks.executeCommand).toHaveBeenCalledWith("syncing.uploadSettings");
    });

    it("does not resurrect a deleted Local scope file", async () =>
    {
        const snippetSettings: ISetting[] = [{
            content: "{}",
            lastModified: Date.parse("2026-08-14T23:00:00Z"),
            localFilePath: "/user/snippets/example.json",
            remoteFilename: "snippet-example.json",
            type: SettingType.Snippets
        }];
        mocks.settings.getSettings.mockResolvedValue(snippetSettings);
        mocks.settings.getLastModified.mockReturnValue(snippetSettings[0]?.lastModified);
        mocks.api.get.mockResolvedValue({ ...remoteSettings, files: {} });

        await service.synchronize(syncingSettings);

        expect(mocks.executeCommand).toHaveBeenCalledWith("syncing.downloadSettings");
    });
});
