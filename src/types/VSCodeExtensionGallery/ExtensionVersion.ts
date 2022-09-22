import type { ExtensionFile } from "./ExtensionFile";
import type { ExtensionProperty } from "./ExtensionProperty";

export interface ExtensionVersion
{
    assetUri: string;
    fallbackAssetUri: string;
    files: ExtensionFile[];
    flags: string;
    lastUpdated: string;
    properties: ExtensionProperty[];
    version: string;
}
