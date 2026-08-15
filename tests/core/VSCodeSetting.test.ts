import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Environment, VSCodeSetting } from "../../src/core";
import { SettingType } from "../../src/types";

import type { IExtension, IGist, ISyncedItem } from "../../src/types";

const mocks = vi.hoisted(() => ({
    extension: {
        getAll: vi.fn(() => []),
        sync: vi.fn()
    },
    fs: {
        outputFile: vi.fn(),
        readFile: vi.fn(),
        readdir: vi.fn(),
        remove: vi.fn(),
        stat: vi.fn(),
        utimes: vi.fn()
    },
    logger: {
        error: vi.fn(),
        info: vi.fn()
    },
    toast: {
        clearSpinner: vi.fn(),
        showSpinner: vi.fn(),
        statusError: vi.fn()
    }
}));

vi.mock("fs-extra", () => mocks.fs);

vi.mock("vscode", () => ({
    env: { remoteName: "ssh-remote" },
    workspace: {
        getConfiguration: () => ({ get: () => [] })
    }
}));

vi.mock("../../src/core/Extension", () => ({
    Extension: { create: () => mocks.extension }
}));

vi.mock("../../src/core/Logger", () => ({
    Logger: { instance: mocks.logger }
}));

vi.mock("../../src/core/Toast", () => mocks.toast);

vi.mock("../../src/i18n", () => ({
    localize: (key: string, ...values: string[]) => [key, ...values].join(":")
}));

const context = {
    extensionUri: {
        fsPath: path.join("root", "extensions", "nonoroazoro.syncing-3.5.3")
    },
    globalStorageUri: {
        fsPath: path.join("root", "data", "User", "globalStorage", "nonoroazoro.syncing")
    }
};

describe("Syncing/core/VSCodeSetting", () =>
{
    const machineDirectory = path.join("root", "data", "Machine");

    beforeEach(() =>
    {
        vi.clearAllMocks();
        mocks.fs.outputFile.mockResolvedValue(undefined);
        Environment.initialize(context);
    });

    it("maps remote settings and extensions to isolated Gist files", async () =>
    {
        const settings = await VSCodeSetting.create().getSettings();

        expect(settings).toEqual([
            {
                localFilePath: path.join(machineDirectory, "settings.json"),
                remoteFilename: "remote-settings.json",
                type: SettingType.Settings
            },
            {
                localFilePath: path.join(machineDirectory, "extensions.json"),
                remoteFilename: "remote-extensions.json",
                type: SettingType.Extensions
            }
        ]);
    });

    it("keeps a missing managed file and aborts on other read errors", async () =>
    {
        const notFound = Object.assign(new Error("missing"), { code: "ENOENT" });
        mocks.fs.readFile.mockRejectedValueOnce(notFound);

        await expect(VSCodeSetting.create().getSettings(true)).resolves.toEqual([
            {
                content: undefined,
                lastModified: undefined,
                localFilePath: path.join(machineDirectory, "settings.json"),
                remoteFilename: "remote-settings.json",
                type: SettingType.Settings
            },
            {
                content: "[]",
                lastModified: undefined,
                localFilePath: path.join(machineDirectory, "extensions.json"),
                remoteFilename: "remote-extensions.json",
                type: SettingType.Extensions
            }
        ]);

        const permissionError = Object.assign(new Error("denied"), { code: "EACCES" });
        mocks.fs.readFile.mockRejectedValueOnce(permissionError);

        await expect(VSCodeSetting.create().getSettings(true, true)).rejects.toBe(permissionError);
        expect(mocks.toast.clearSpinner).toHaveBeenCalledWith("");
        expect(mocks.toast.statusError).toHaveBeenCalledWith("toast.settings.uploading.failed:denied");
    });

    it("downloads only Remote scope files", async () =>
    {
        const extension: IExtension = {
            id: "publisher.remote-extension",
            name: "remote-extension",
            publisher: "publisher",
            version: "1.0.0"
        };
        const syncedExtension: ISyncedItem = {
            extension: {
                added: [extension],
                addedErrors: [],
                removed: [],
                removedErrors: [],
                updated: [],
                updatedErrors: []
            }
        };
        const gist: IGist = {
            description: "VSCode's Settings - Syncing",
            files: {
                "remote-extensions.json": {
                    content: JSON.stringify([extension]),
                    filename: "remote-extensions.json"
                },
                "remote-settings.json": {
                    content: '{"editor.fontSize": 16}',
                    filename: "remote-settings.json"
                },
                "settings.json": {
                    content: '{"editor.fontSize": 14}',
                    filename: "settings.json"
                },
                "snippet-example.json": {
                    content: '{"Example": {}}',
                    filename: "snippet-example.json"
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
        const notFound = Object.assign(new Error("missing"), { code: "ENOENT" });
        mocks.fs.readFile.mockRejectedValueOnce(notFound);
        mocks.extension.sync.mockResolvedValueOnce(syncedExtension);

        await expect(VSCodeSetting.create().saveSettings(gist)).resolves.toEqual({
            removed: [],
            updated: [
                {
                    setting: {
                        content: '{"editor.fontSize": 16}',
                        localFilePath: path.join(machineDirectory, "settings.json"),
                        remoteFilename: "remote-settings.json",
                        type: SettingType.Settings
                    }
                },
                syncedExtension
            ]
        });

        expect(mocks.fs.outputFile).toHaveBeenCalledOnce();
        expect(mocks.fs.outputFile).toHaveBeenCalledWith(
            path.join(machineDirectory, "settings.json"),
            '{"editor.fontSize": 16}'
        );
        expect(mocks.extension.sync).toHaveBeenCalledWith([extension], true);
    });
});
