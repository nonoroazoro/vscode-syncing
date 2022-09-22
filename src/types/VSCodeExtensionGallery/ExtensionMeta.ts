import type { ExtensionPublisher } from "./ExtensionPublisher";
import type { ExtensionVersion } from "./ExtensionVersion";

export interface ExtensionMeta
{
    categories: string[];
    displayName: string;
    extensionId: string; // UUID
    extensionName: string;
    flags: string;
    lastUpdated: string;
    publishedDate: string;
    publisher: ExtensionPublisher;
    releaseDate: string;
    shortDescription: string;
    tags: string[];
    versions: ExtensionVersion[];
}
