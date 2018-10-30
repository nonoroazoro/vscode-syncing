import { readJsonSync } from "fs-extra";
import * as path from "path";

import { format } from "../utils/template";

let instance: I18n;

/**
 * I18n.
 */
class I18n
{
    private static _instance: I18n;
    private static DEFAULT_LOCALE: string = "en-us";
    private static DEFAULT_LOCALE_FILENAME: string = "package.nls.json";

    private _bundle: Record<string, string>;
    private _extensionPath: string;
    private _locale: string;

    private constructor(extensionPath: string, vscodeLocale: string)
    {
        this._extensionPath = extensionPath;
        this._locale = vscodeLocale;
        this._prepare();
    }

    /**
     * Creates an instance of the singleton class `I18n`.
     */
    public static create(extensionPath: string): I18n
    {
        if (!I18n._instance || I18n._instance._extensionPath !== extensionPath)
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
            I18n._instance = new I18n(extensionPath, vscodeLocale);
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
            this._bundle = readJsonSync(
                path.resolve(this._extensionPath, filename),
                { encoding: "utf8" }
            );
        }
        catch (err)
        {
            this._bundle = readJsonSync(
                path.resolve(this._extensionPath, I18n.DEFAULT_LOCALE_FILENAME),
                { encoding: "utf8" }
            );
        }
    }
}

/**
 * Setup the i18n module.
 */
export function setup(extensionPath: string): void
{
    instance = I18n.create(extensionPath);
}

/**
 * Gets the locale of VSCode.
 */
export function locale(): string
{
    return instance.locale;
}

/**
 * Gets the localized message.
 *
 * @param {string} key The key of the message.
 * @param {...any[]} templateValues If the message is a template string, these args will be used to replace the templates.
 */
export function localize(key: string, ...templateValues: any[]): string
{
    return instance.localize(key, ...templateValues);
}
