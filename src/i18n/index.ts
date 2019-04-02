import { readJsonSync } from "fs-extra";
import * as path from "path";

import { NormalizedLocale } from "../types/NormalizedLocale";
import { format } from "../utils/template";
import { getNormalizedVSCodeLocale } from "../utils/vscodeAPI";

let instance: I18n;

class I18n
{
    private static _instance: I18n;
    private static DEFAULT_LOCALE_FILENAME: string = "package.nls.json";

    private _bundle: Record<string, string>;
    private _extensionPath: string;
    private _locale: NormalizedLocale;

    private constructor(extensionPath: string)
    {
        this._extensionPath = extensionPath;
        this._locale = getNormalizedVSCodeLocale();
        this._prepare();
    }

    /**
     * Creates an instance of the singleton class `I18n`.
     */
    public static create(extensionPath: string): I18n
    {
        if (!I18n._instance || I18n._instance._extensionPath !== extensionPath)
        {
            I18n._instance = new I18n(extensionPath);
        }
        return I18n._instance;
    }

    /**
     * Gets the VSCode locale.
     */
    public get locale(): NormalizedLocale
    {
        return this._locale;
    }

    /**
     * Gets the localized message.
     *
     * @param {string} key The key of the message.
     * @param {...any[]} templateValues If the message is a template string,
     * these args will be used to replace the templates.
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
        const filename = (this.locale === NormalizedLocale.EN_US)
            ? I18n.DEFAULT_LOCALE_FILENAME
            : `package.nls.${this.locale}.json`;
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
 * Gets the VSCode locale.
 */
export function locale(): NormalizedLocale
{
    return instance.locale;
}

/**
 * Gets the localized message.
 *
 * @param {string} key The key of the message.
 * @param {...any[]} templateValues If the message is a template string,
 * these args will be used to replace the templates.
 */
export function localize(key: string, ...templateValues: any[]): string
{
    return instance.localize(key, ...templateValues);
}
