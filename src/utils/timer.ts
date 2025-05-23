/**
 * Debounce a function.
 *
 * @param {Function} func The function to debounce.
 * @param {number} delay The number of milliseconds to delay.
 */
export function debounce<T extends Function>(func: T, delay: number)
{
    let timeout: NodeJS.Timeout | undefined;
    const _debounced = function (this: any)
    {
        if (timeout != null)
        {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() =>
        {
            timeout = undefined;
            func.apply(this);
        }, delay);
    }
    _debounced.cancel = () =>
    {
        if (timeout)
        {
            clearTimeout(timeout);
            timeout = undefined;
        }
    }
    return _debounced;
}
