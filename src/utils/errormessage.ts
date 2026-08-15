/**
 * Gets a message from an unknown error value.
 *
 * @param error The error value.
 */
export function getErrorMessage(error: unknown): string
{
    return error instanceof Error ? error.message : String(error);
}
