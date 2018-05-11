/**
 * Represent the types of various `VSCode Setting`, such as `Extensions`, `Keybindings`...
 */
export enum SettingTypes
{
    Extensions,

    Keybindings,

    Locale,

    Settings,

    Snippets
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
