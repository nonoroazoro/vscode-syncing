/**
 * JSON scalar.
 */
type JSONScalar = boolean | number | string | null;

/**
 * JSON value.
 */
type JSONValue = JSONArray | JSONObject | JSONScalar;

/**
 * JSON object.
 */
type JSONObject = {
    [key in string]?: JSONValue
};

/**
 * JSON array.
 */
interface JSONArray extends Array<JSONValue> { }
