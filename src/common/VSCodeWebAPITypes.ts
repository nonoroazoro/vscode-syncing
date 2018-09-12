export interface IExtensionMeta
{
    categories: string[];
    displayName: string;
    extensionId: string; // UUID
    extensionName: string;
    flags: string;
    lastUpdated: string;
    publishedDate: string;
    publisher: IExtensionPublisher[];
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
    flags: string;
    lastUpdated: string;
    version: string;
}
