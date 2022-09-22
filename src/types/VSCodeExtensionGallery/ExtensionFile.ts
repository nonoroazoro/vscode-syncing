import type { ExtensionAssetType } from "./ExtensionAssetType";

export interface ExtensionFile
{
    assetType: ExtensionAssetType;
    source: string;
}
