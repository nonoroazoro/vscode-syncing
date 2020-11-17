import * as jsonc from "jsonc-parser";
import * as micromatch from "micromatch";

import { getJSONFormatOnSaveSetting } from "./vscodeAPI";
import { JSONObject } from "../typings/json";
import { SETTING_EXCLUDED_SETTINGS } from "../constants";

/**
 * The default `ModificationOptions` of `jsonc-parser`.
 */
const JSONC_MODIFICATION_OPTIONS = {
    formattingOptions: {
        tabSize: 4,
        insertFinalNewline: true,
        insertSpaces: true
    }
};

/**
 * Removes the excluded properties based on the exclude list (glob patterns).
 *
 * Creates and returns the new settings JSON string.
 *
 * @param {string} settingsJSONString VSCode settings in `JSON string` format.
 * @param {JSONObject} settingsJSON VSCode settings in `JSON object` format.
 * @param {string[]} patterns The exclude list (glob patterns).
 */
export function excludeSettings(settingsJSONString: string, settingsJSON: JSONObject, patterns: string[]): string
{
    let result = settingsJSONString;
    if (settingsJSON && settingsJSONString)
    {
        let modified = false;
        let edits: jsonc.Edit[];
        const excludedKeys = getExcludedKeys(settingsJSON, patterns);
        for (const key of excludedKeys)
        {
            // Remove the listed properties.
            edits = jsonc.modify(result, [key], undefined, JSONC_MODIFICATION_OPTIONS);
            if (edits.length > 0)
            {
                modified = true;
            }
            result = jsonc.applyEdits(result, edits);
        }

        if (modified)
        {
            const formatOnSave = getJSONFormatOnSaveSetting(settingsJSON);
            if (formatOnSave == null || formatOnSave)
            {
                // Format if the result is modified and formatOnSave is true or undefined.
                result = format(result);
            }
        }
    }
    return result;
}

/**
 * Merges the source VSCode settings with the destination settings,
 * based on the exclude list (glob patterns) of source settings.
 *
 * Creates and returns the new source settings JSON string.
 *
 * @param {string} sSettingsJSONString The source settings.
 * @param {string} dSettingsJSONString The destination settings.
 */
export function mergeSettings(sSettingsJSONString: string, dSettingsJSONString: string): string
{
    let result = sSettingsJSONString;
    const sSettingsJSON = parse(result);
    const dSettingsJSON = parse(dSettingsJSONString);
    if (sSettingsJSON && dSettingsJSON)
    {
        // Get all of the matched properties from the source and destination settings.
        const sPatterns = sSettingsJSON[SETTING_EXCLUDED_SETTINGS] || [];
        const sExcludedKeys = getExcludedKeys(sSettingsJSON, sPatterns);
        const dExcludedKeys = getExcludedKeys(dSettingsJSON, sPatterns);
        const excludedKeys = Array.from<string>(new Set([...sExcludedKeys, ...dExcludedKeys])).sort((a, b) => a.localeCompare(b));

        // Replace the source properties with the corresponding destination properties values.
        let dValue: any;
        let modified = false;
        let edits: jsonc.Edit[];
        for (const key of excludedKeys)
        {
            dValue = dSettingsJSON[key];
            if (dValue !== sSettingsJSON[key])
            {
                // Note that `dValue` could be `undefined`, which means removing the property from the source settings,
                // otherwise replacing with the destination property value.
                edits = jsonc.modify(result, [key], dValue, JSONC_MODIFICATION_OPTIONS);
                if (edits.length > 0)
                {
                    modified = true;
                }
                result = jsonc.applyEdits(result, edits);
            }
        }

        if (modified)
        {
            const formatOnSave = getJSONFormatOnSaveSetting(sSettingsJSON);
            if (formatOnSave == null || formatOnSave)
            {
                // Format if the result is modified and formatOnSave is true or undefined.
                result = format(result);
            }
        }
    }
    return result;
}

/**
 * Gets the JSON property keys based on the exclude list (`glob patterns`) of Syncing.
 */
export function getExcludedKeys(settingsJSON: JSONObject, patterns: string[]): string[]
{
    const excludeKeys: string[] = [];
    const keys = Object.keys(settingsJSON);
    for (const key of keys)
    {
        // Get JSON path that matches with the exclude list.
        if (patterns.some((pattern) => micromatch.isMatch(key, pattern)))
        {
            excludeKeys.push(key);
        }
    }
    return excludeKeys.sort((a, b) => a.localeCompare(b));
}

/**
 * Formats the given JSON string.
 */
export function format(jsonString: string, formattingOptions = JSONC_MODIFICATION_OPTIONS.formattingOptions): string
{
    const edits = jsonc.format(jsonString, undefined, formattingOptions);
    return jsonc.applyEdits(jsonString, edits);
}

/**
 * Parses the given text and returns the object the JSON content represents.
 */
export function parse(text: string)
{
    // Evaluates in a fault tolerant fashion and never throw exceptions.
    return jsonc.parse(text);
}
