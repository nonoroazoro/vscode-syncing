/**
 * JSON value.
 */
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

/**
 * JSON object.
 */
export type JSONObject = {
    [key in string]?: JSONValue
};

/**
 * JSON array.
 */
export interface JSONArray extends Array<JSONValue> { }
