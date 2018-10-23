/**
 * I18n.
 */
export class I18n
{
    private static _instance: I18n;
    private static DEFAULT_LOCALE: string = "en-us";

    private _locale: string;
    private _bundle: Record<string, string>;

    private constructor(locale: string)
    {
        this._locale = locale;
        this._prepare();
    }

    /**
     * Creates an instance of the singleton class `I18n`.
     */
    public static create(): I18n
    {
        let locale: string | undefined;
        try
        {
            locale = JSON.parse(process.env.VSCODE_NLS_CONFIG || "{}").locale;
        }
        catch (err)
        {
        }
        locale = locale || I18n.DEFAULT_LOCALE;

        if (!I18n._instance || I18n._instance.locale !== locale)
        {
            I18n._instance = new I18n(locale);
        }
        return I18n._instance;
    }

    /**
     * Gets the locale of VSCode.
     */
    public get locale(): string
    {
        return this._locale;
    }

    /**
     * Gets the localized message.
     *
     * @param {string} key The key of the message.
     */
    public localize(key: string): string
    {
        return this._bundle[key];
    }

    private _prepare()
    {
        const filename = (this.locale.toLowerCase() === I18n.DEFAULT_LOCALE)
            ? "package.nls.json"
            : `package.nls.${this.locale}.json`;
        try
        {
            this._bundle = require(`../../${filename}`);
        }
        catch (err)
        {
            this._bundle = require("../../package.nls.json");
        }
    }
}
