import { readJsonSync } from "fs-extra";
import * as path from "path";

import { format } from "../utils/template";

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

    private constructor(vscodeLocale: string)
    {
        this._locale = vscodeLocale;
        this._prepare();
    }

    /**
     * Creates an instance of the singleton class `I18n`.
     */
    public static create(): I18n
    {
        if (!I18n._instance)
        {
            let vscodeLocale: string | undefined;
            try
            {
                vscodeLocale = JSON.parse(process.env.VSCODE_NLS_CONFIG || "{}").locale;
            }
            catch (err)
            {
            }
            vscodeLocale = vscodeLocale || I18n.DEFAULT_LOCALE;
            I18n._instance = new I18n(vscodeLocale);
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
     * @param {...any[]} templateValues If the message is a template string, these args will be used to replace the templates.
     */
    public localize(key: string, ...templateValues: any[]): string
    {
        const message = this._bundle[key];
        if (templateValues.length > 0)
        {
            return format(message, ...templateValues);
        }
        return message;
    }

    private _prepare()
    {
        const lowerCaseLocale = this.locale.toLowerCase();
        const filename = (lowerCaseLocale === I18n.DEFAULT_LOCALE)
            ? I18n.DEFAULT_LOCALE_FILENAME
            : `package.nls.${lowerCaseLocale}.json`;
        try
        {
            this._bundle = readJsonSync(path.resolve(__dirname, `../../${filename}`), { encoding: "utf8" });
        }
        catch (err)
        {
            this._bundle = readJsonSync(path.resolve(__dirname, `../../${I18n.DEFAULT_LOCALE_FILENAME}`), { encoding: "utf8" });
        }
    }
}

/**
 * Gets the locale of VSCode.
 */
export function locale(): string
{
    return I18n.create().locale;
}

/**
 * Gets the localized message.
 *
 * @param {string} key The key of the message.
 * @param {...any[]} templateValues If the message is a template string, these args will be used to replace the templates.
 */
export function localize(key: string, ...templateValues: any[]): string
{
    return I18n.create().localize(key, ...templateValues);
}
