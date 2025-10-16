/**
 * Represents the editions of VSCode.
 */
export enum VSCodeEdition
{
    /**
     * The VSCode Standard Builds.
     */
    STANDARD = "standard",

    /**
     * The VSCode Insiders.
     */
    INSIDERS = "insiders",

    /**
     * The VSCode Exploration Builds.
     */
    EXPLORATION = "exploration",

    /**
     * The VSCode under FLOSS license, see [VSCodium](https://github.com/VSCodium/vscodium).
     */
    VSCODIUM = "vscodium",

    /**
     * The VSCode Insiders under FLOSS license, see [VSCodium](https://github.com/VSCodium/vscodium).
     */
    VSCODIUM_INSIDERS = "vscodium-insiders",

    /**
     * The self-compiled version of VSCode under
     * [the default configuration](https://github.com/Microsoft/vscode/blob/master/product.json).
     */
    OSS = "oss",

    /**
     * The VSCode provided by [Coder](https://coder.com), which is running on a remote or self-hosted server.
     */
    CODER = "coder",

    /**
     * The OSS VSCode server provided by [Coder](https://coder.com), which is running on a remote or self-hosted server.
     */
    CODESERVER = "codeserver",

    /**
     * Cursor AI Code Editor, see [Cursor](https://www.cursor.com/).
     */
    CURSOR = "cursor",

    /**
     * WindSurf AI Code Editor, see [WindSurf](https://windsurf.com/).
     */
    WINDSURF = "windsurf",

    /**
     * Trae AI Code Editor, see [Trae](https://www.trae.ai/).
     */
    TRAE = "trae",

    /**
     * Trae AI Code Editor CN version, see [Trae CN](https://www.trae.com.cn/).
     */
    TRAE_CN = "trae-cn"
}
