// Dot-separated identifiers, same as the sections of VSCode, see `vscode.workspace.getConfiguration`.
export const CONFIGURATION_KEY = "syncing";
export const CONFIGURATION_EXCLUDED_EXTENSIONS = "excludedExtensions";
export const CONFIGURATION_EXCLUDED_SETTINGS = "excludedSettings";
export const CONFIGURATION_EXTENSIONS_AUTOUPDATE = "extensions.autoUpdate";
export const CONFIGURATION_POKA_YOKE_THRESHOLD = "pokaYokeThreshold";
export const CONFIGURATION_SEPARATE_KEYBINDINGS = "separateKeybindings";

// Dot-separated identifiers, used to access the properties of Syncing's VSCode settings.
export const SETTING_EXCLUDED_EXTENSIONS = `${CONFIGURATION_KEY}.${CONFIGURATION_EXCLUDED_EXTENSIONS}`;
export const SETTING_EXCLUDED_SETTINGS = `${CONFIGURATION_KEY}.${CONFIGURATION_EXCLUDED_SETTINGS}`;
