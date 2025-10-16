/**
 * Format the template with specified values.
 *
 * For example:
 *
 * With the template `"Hello, {0} and {1}!"` and the values `["Jack", "Rose"]`, you'll get `"Hello, Jack and Rose!"`.
 *
 * @param {string} template The template string.
 * @param {...string[]} values The values.
 */
export function format(template: string, ...values: string[])
{
    if (template == null)
    {
        return template;
    }

    return values.reduce((prev, value, index) =>
    {
        return prev.replace(new RegExp(`\\{${index}\\}`, "gm"), value);
    }, template);
}
