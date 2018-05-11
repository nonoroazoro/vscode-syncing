/**
 * Represent the types of various `VSCode Setting`, such as `Extensions`, `Keybindings`...
 */
export enum SettingTypes
{
    Extensions = "Extensions",
    Keybindings = "Keybindings",
    Locale = "Locale",
    Settings = "Settings",
    Snippets = "Snippets"
}

/**
 * Represent a `VSCode Setting`.
 */
export interface ISetting
{
    /**
     * Settings filename.
     */
    name: string;

    /**
     * Settings content.
     */
    content?: string;

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
