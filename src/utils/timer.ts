/**
 * Debounce a function.
 *
 * @param {(...args: unknown[]) => void} func The function to debounce.
 * @param {number} delay The number of milliseconds to delay.
 */
export function debounce<TArgs extends unknown[]>(func: (...args: TArgs) => void, delay: number)
{
    let timer: NodeJS.Timeout | undefined;
    const d = function debounced(this: unknown, ...args: TArgs)
    {
        if (timer != null)
        {
            clearTimeout(timer);
        }

        timer = setTimeout(() =>
        {
            timer = undefined;
            func.apply(this, args);
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
