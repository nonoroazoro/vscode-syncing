import type { ExtensionFile } from "./ExtensionFile";
import type { ExtensionProperty } from "./ExtensionProperty";

export interface ExtensionVersion
{
    version: string;
    targetPlatform: string;
    flags: string;
    lastUpdated: string;

    files?: ExtensionFile[];
    properties?: ExtensionProperty[];
}
