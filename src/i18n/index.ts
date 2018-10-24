let instance: I18n;

/**
 * I18n.
 */
class I18n
{
    private static _instance: I18n;
    private static DEFAULT_LOCALE: string = "en-us";
    private static DEFAULT_LOCALE_FILENAME: string = "package.nls.json";

    private _locale: string;
    private _bundle: Record<string, string>;

    private constructor(currentLocale: string)
    {
        this._locale = currentLocale;
        this._prepare();
    }

    /**
     * Creates an instance of the singleton class `I18n`.
     */
    public static create(): I18n
    {
        let currentLocale: string | undefined;
        try
        {
            currentLocale = JSON.parse(process.env.VSCODE_NLS_CONFIG || "{}").locale;
        }
        catch (err)
        {
        }
        currentLocale = currentLocale || I18n.DEFAULT_LOCALE;

        if (!I18n._instance || I18n._instance.locale !== currentLocale)
        {
            I18n._instance = new I18n(currentLocale);
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
        const lowerCaseLocale = this.locale.toLowerCase();
        const filename = (lowerCaseLocale === I18n.DEFAULT_LOCALE)
            ? I18n.DEFAULT_LOCALE_FILENAME
            : `package.nls.${lowerCaseLocale}.json`;
        try
        {
            this._bundle = require(`../../${filename}`);
        }
        catch (err)
        {
            this._bundle = require(`../../${I18n.DEFAULT_LOCALE_FILENAME}`);
        }
    }
}

/**
 * Gets the locale of VSCode.
 */
export function locale(): string
{
    if (!instance)
    {
        instance = I18n.create();
    }
    return instance.locale;
}

/**
 * Gets the localized message.
 *
 * @param {string} key The key of the message.
 */
export function localize(key: string): string
{
    if (!instance)
    {
        instance = I18n.create();
    }
    return instance.localize(key);
}
