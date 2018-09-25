export interface IExtensionMeta
{
    categories: string[];
    displayName: string;
    extensionId: string; // UUID
    extensionName: string;
    flags: string;
    lastUpdated: string;
    publishedDate: string;
    publisher: IExtensionPublisher;
    releaseDate: string;
    shortDescription: string;
    tags: string[];
    versions: IExtensionVersion[];
}

export interface IExtensionPublisher
{
    displayName: string;
    flags: string;
    publisherId: string; // UUID
    publisherName: string;
}

export interface IExtensionVersion
{
    assetUri: string;
    fallbackAssetUri: string;
    files: IExtensionFile[];
    flags: string;
    lastUpdated: string;
    properties: any[];
    version: string;
}

export interface IExtensionFile
{
    assetType: ExtensionAssetType;
    source: string;
}

export enum ExtensionAssetType
{
    CODE_MANIFEST = "Microsoft.VisualStudio.Code.Manifest",
    SERVICES_CONTENT_CHANGELOG = "Microsoft.VisualStudio.Services.Content.Changelog",
    SERVICES_CONTENT_DETAILS = "Microsoft.VisualStudio.Services.Content.Details",
    SERVICES_CONTENT_LICENSE = "Microsoft.VisualStudio.Services.Content.License",
    SERVICES_ICONS_DEFAULT = "Microsoft.VisualStudio.Services.Icons.Default",
    SERVICES_ICONS_SMALL = "Microsoft.VisualStudio.Services.Icons.Small",
    SERVICES_VSIXMANIFEST = "Microsoft.VisualStudio.Services.VsixManifest",
    SERVICES_VSIXPACKAGE = "Microsoft.VisualStudio.Services.VSIXPackage"
}

export enum QueryFilterType
{
    /**
     * Query extensions by id, which is in the form of `publisher.name`.
     */
    NAME = 7,

    /**
     * Query extensions by UUID.
     */
    UUID = 4
}

export enum QueryFlag
{
    /**
     * All versions but without files.
     */
    ALL_VERSIONS_WITHOUT_FILES = 133,

    /**
     * Latest version with files.
     */
    LATEST_VERSION_WITH_FILES = 914
}
