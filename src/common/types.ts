/**
 * Represent the types of various `VSCode Setting`, such as `Extensions`, `Keybindings`...
 */
export enum SettingTypes
{
    Extensions = "extensions",
    Keybindings = "keybindings",
    Locale = "locale",
    Settings = "settings",
    Snippets = "snippets"
}

/**
 * Represent a `VSCode Setting`.
 */
export interface ISetting
{
    /**
     * Settings content.
     */
    content?: string;

    /**
     * Settings local filename.
     */
    filename: string;

    /**
     * Settings local filepath.
     */
    filepath: string;

    /**
     * Settings filename in GitHub Gist.
     */
    remoteFilename: string;

    /**
     * Settings type.
     */
    type: SettingTypes;
}
