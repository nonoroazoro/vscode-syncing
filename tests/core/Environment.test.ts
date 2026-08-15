import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    logger: {
        info: vi.fn()
    },
    remoteName: undefined as string | undefined
}));

vi.mock("vscode", () => ({
    env: {
        get remoteName()
        {
            return mocks.remoteName;
        }
    }
}));

vi.mock("../../src/core/Logger", () => ({
    Logger: { instance: mocks.logger }
}));

vi.mock("../../src/i18n", () => ({
    localize: (key: string) => key
}));

const context = {
    extensionUri: {
        fsPath: path.join("root", "extensions", "nonoroazoro.syncing-3.5.3")
    },
    globalStorageUri: {
        fsPath: path.join("root", "data", "User", "globalStorage", "nonoroazoro.syncing")
    }
};

async function createEnvironment(remoteName?: string)
{
    vi.resetModules();
    mocks.remoteName = remoteName;
    const { Environment } = await import("../../src/core");
    Environment.initialize(context);
    return Environment.instance;
}

describe("Syncing/core/Environment", () =>
{
    beforeEach(() => vi.clearAllMocks());

    it("uses the user directory for local settings", async () =>
    {
        const environment = await createEnvironment();
        const userDirectory = path.join("root", "data", "User");

        expect(environment.isRemote).toBe(false);
        expect(environment.userDirectory).toBe(userDirectory);
        expect(environment.settingsDirectory).toBe(userDirectory);
        expect(environment.snippetsDirectory).toBe(path.join(userDirectory, "snippets"));
        expect(environment.getSettingsFilePath("settings.json")).toBe(path.join(userDirectory, "settings.json"));
        expect(environment.getUserFilePath("syncing.json")).toBe(path.join(userDirectory, "syncing.json"));
    });

    it.each(["ssh-remote", "wsl", "dev-container"])(
        "uses the machine directory for %s settings",
        async remoteName =>
        {
            const environment = await createEnvironment(remoteName);
            const userDirectory = path.join("root", "data", "User");
            const machineDirectory = path.join("root", "data", "Machine");

            expect(environment.isRemote).toBe(true);
            expect(environment.settingsDirectory).toBe(machineDirectory);
            expect(environment.snippetsDirectory).toBe(path.join(userDirectory, "snippets"));
            expect(environment.getSettingsFilePath("settings.json"))
                .toBe(path.join(machineDirectory, "settings.json"));
            expect(environment.getUserFilePath("syncing.json")).toBe(path.join(userDirectory, "syncing.json"));
        }
    );
});
