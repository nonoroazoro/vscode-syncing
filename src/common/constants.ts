// Dot-separated identifiers, same as the secions of VSCode, see `vscode.workspace.getConfiguration`.
export const CONFIGURATION_KEY = "syncing";
export const CONFIGURATION_POKA_YOKE_THRESHOLD = "pokaYokeThreshold";
export const CONFIGURATION_UPLOAD_EXCLUDE = "upload.exclude";

// Dot-separated identifiers, used to access the properties of VSCode settings file.
export const SETTINGS_POKA_YOKE_THRESHOLD = `${CONFIGURATION_KEY}.${CONFIGURATION_POKA_YOKE_THRESHOLD}`;
export const SETTINGS_UPLOAD_EXCLUDE = `${CONFIGURATION_KEY}.${CONFIGURATION_UPLOAD_EXCLUDE}`;
