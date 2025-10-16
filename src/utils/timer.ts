/**
 * Debounce a function.
 *
 * @param {(...args: unknown[]) => void} func The function to debounce.
 * @param {number} delay The number of milliseconds to delay.
 */
export function debounce(func: (...args: unknown[]) => void, delay: number)
{
    let timer: NodeJS.Timeout | undefined;
    const d = function debounced(this: unknown)
    {
        if (timer != null)
        {
            clearTimeout(timer);
        }

        timer = setTimeout(() =>
        {
            timer = undefined;
            func.apply(this);
        }, delay);
    };
    d.cancel = () =>
    {
        if (timer)
        {
            clearTimeout(timer);
            timer = undefined;
        }
    };
    return d;
}
