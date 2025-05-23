import { SettingType, VSCodeEdition } from "../types";

/**
 * Note that this is an ordered list, to ensure that the smaller files
 * (such as `settings.json`, `keybindings.json`) are synced first.
 * Thus, the `extensions` will be the last one to sync.
 */
export const VSCODE_SETTINGS_LIST = [
    SettingType.Settings,
    SettingType.Keybindings,
    SettingType.Locale,
    SettingType.Snippets,
    SettingType.Extensions
];

/**
 * Dot-separated identifiers, same as the sections of VSCode, see `vscode.workspace.getConfiguration`.
 */
export const CONFIGURATION_KEY = "syncing";
export const CONFIGURATION_EXCLUDED_EXTENSIONS = "excludedExtensions";
export const CONFIGURATION_EXCLUDED_SETTINGS = "excludedSettings";
export const CONFIGURATION_EXTENSIONS_AUTOUPDATE = "extensions.autoUpdate";
export const CONFIGURATION_POKA_YOKE_THRESHOLD = "pokaYokeThreshold";
export const CONFIGURATION_SEPARATE_KEYBINDINGS = "separateKeybindings";

/**
 * Dot-separated identifiers, used to access the properties of Syncing's VSCode settings.
 */
export const SETTING_EXCLUDED_EXTENSIONS = `${CONFIGURATION_KEY}.${CONFIGURATION_EXCLUDED_EXTENSIONS}`;
export const SETTING_EXCLUDED_SETTINGS = `${CONFIGURATION_KEY}.${CONFIGURATION_EXCLUDED_SETTINGS}`;

/**
 * The builtin-environments of different VSCode editions.
 */
export const VSCODE_BUILTIN_ENVIRONMENTS: Record<VSCodeEdition, {
    dataDirectoryName: string;
    extensionsDirectoryName: string;
}> = {
    [VSCodeEdition.STANDARD]: {
        dataDirectoryName: "Code",
        extensionsDirectoryName: ".vscode"
    },
    [VSCodeEdition.INSIDERS]: {
        dataDirectoryName: "Code - Insiders",
        extensionsDirectoryName: ".vscode-insiders"
    },
    [VSCodeEdition.EXPLORATION]: {
        dataDirectoryName: "Code - Exploration",
        extensionsDirectoryName: ".vscode-exploration"
    },
    [VSCodeEdition.VSCODIUM]: {
        dataDirectoryName: "VSCodium",
        extensionsDirectoryName: ".vscode-oss"
    },
    [VSCodeEdition.VSCODIUM_INSIDERS]: {
        dataDirectoryName: "VSCodium - Insiders",
        extensionsDirectoryName: ".vscodium-insiders"
    },
    [VSCodeEdition.OSS]: {
        dataDirectoryName: "Code - OSS",
        extensionsDirectoryName: ".vscode-oss"
    },
    [VSCodeEdition.CODER]: {
        dataDirectoryName: "Code",
        extensionsDirectoryName: "vscode"
    },
    [VSCodeEdition.CODESERVER]: {
        dataDirectoryName: "../.local/share/code-server",
        extensionsDirectoryName: ".local/share/code-server"
    },
    [VSCodeEdition.CURSOR]: {
        dataDirectoryName: "Cursor",
        extensionsDirectoryName: ".cursor"
    },
    [VSCodeEdition.WINDSURF]: {
        dataDirectoryName: "WindSurf",
        extensionsDirectoryName: ".windsurf"
    }
};
