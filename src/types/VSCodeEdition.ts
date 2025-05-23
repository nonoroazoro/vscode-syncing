/**
 * Represents the editions of VSCode.
 */
export enum VSCodeEdition
{
    /**
     * The VSCode Standard Builds.
     */
    STANDARD,

    /**
     * The VSCode Insiders.
     */
    INSIDERS,

    /**
     * The VSCode Exploration Builds.
     */
    EXPLORATION,

    /**
     * The VSCode under FLOSS license, see [VSCodium](https://github.com/VSCodium/vscodium).
     */
    VSCODIUM,

    /**
     * The VSCode Insiders under FLOSS license, see [VSCodium](https://github.com/VSCodium/vscodium).
     */
    VSCODIUM_INSIDERS,

    /**
     * The self-compiled version of VSCode under
     * [the default configuration](https://github.com/Microsoft/vscode/blob/master/product.json).
     */
    OSS,

    /**
     * The VSCode provided by [Coder](https://coder.com), which is running on a remote or self-hosted server.
     */
    CODER,

    /**
     * The OSS VSCode server provided by [Coder](https://coder.com), which is running on a remote or self-hosted server.
     */
    CODESERVER,

    /**
     * Cursor AI Code Editor, see [Cursor](https://www.cursor.com/).
     */
    CURSOR,

    /**
     * WindSurf AI Code Editor, see [WindSurf](https://windsurf.com/).
     */
    WINDSURF
}
