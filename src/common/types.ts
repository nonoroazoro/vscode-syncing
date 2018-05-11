/**
 * Represent the type of VSCode settings.
 */
export enum ConfigTypes
{
    Extensions,

    Keybindings,

    Locale,

    Settings,

    Snippets
}

/**
 * Represent a VSCode settings.
 */
export interface IConfig
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
    type: ConfigTypes;
}
