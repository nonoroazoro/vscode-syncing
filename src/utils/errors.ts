/**
 * Represents an enhanced `Error`.
 */
export interface IEnhancedError extends Error
{
    /**
     * The error code, if available.
     */
    code?: number | string;

    /**
     * The request, if available.
     */
    request?: unknown;

    /**
     * The response, if available.
     */
    response?: unknown;

    /**
     * The meta data, if available.
     */
    meta?: unknown;
}

/**
 * Creates an `Enhanced Error` object with the specified
 * message, error code, request, response and meta data.
 *
 * @param {string} message The error message.
 * @param {(number | string)} [code] The error code.
 * @param {unknown} [request] The request.
 * @param {unknown} [response] The response.
 * @param {unknown} [meta] The meta data.
 * @returns {Error} The created error.
 */
export function createError(
    message?: string,
    code?: number | string,
    request?: unknown,
    response?: unknown,
    meta?: unknown
): IEnhancedError
{
    return enhanceError(new Error(message), code, request, response, meta);
}

/**
 * Enhances an existing `Error` or `Enhanced Error` object with the specified
 * error code, request, response and meta data.
 *
 * @param {(Error | IEnhancedError)} error The error to enhance.
 * @param {(number | string)} [code] The error code.
 * @param {unknown} [request] The request.
 * @param {unknown} [response] The response.
 * @param {unknown} [meta] The meta data.
 */
export function enhanceError(
    error: Error | IEnhancedError,
    code?: number | string,
    request?: unknown,
    response?: unknown,
    meta?: unknown
): IEnhancedError
{
    const e: IEnhancedError = error;
    if (code != null)
    {
        e.code = code;
    }

    if (request != null)
    {
        e.request = request;
    }

    if (response != null)
    {
        e.response = response;
    }

    if (meta != null)
    {
        e.meta = meta;
    }
    return e;
}
