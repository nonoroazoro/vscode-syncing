/**
 * Represents the types of the various `VSCode Settings`, such as `Extensions`, `Keybindings`...
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
 * Represents a `VSCode Setting`.
 */
export interface ISetting
{
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

/**
 * Represents a VSCode extension.
 */
export interface IExtension
{
    /**
     * The extension's identifier is in the form of: `publisher.name`.
     */
    id: string;

    /**
     * The extension's name.
     */
    name: string;

    /**
     * The extension's publisher.
     */
    publisher: string;

    /**
     * The extension's version.
     */
    version: string;

    /**
     * The downloaded extension's vsix file path.
     */
    vsixFilepath?: string;

    /**
     * The extension's download url in marketplace.
     */
    downloadURL?: string;
}

/**
 * Represents the currently synced item.
 */
export interface ISyncedItem
{
    /**
     * Extensions that have been added, updated or removed.
     */
    extension?: {
        added: IExtension[],
        addedErrors: IExtension[],
        updated: IExtension[],
        updatedErrors: IExtension[],
        removed: IExtension[],
        removedErrors: IExtension[]
    };

    /**
     * `VSCode Setting` that have been added, updated or removed.
     */
    setting?: ISetting;
}
