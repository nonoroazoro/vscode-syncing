import { localize } from "../i18n";
import { Platform } from "../types/Platform";
import { getNormalizedVSCodeLocale } from "../utils/vscodeAPI";

export const isWindows = (process.platform === "win32");
export const isMacintosh = (process.platform === "darwin");
export const isLinux = (process.platform === "linux");
export const locale = getNormalizedVSCodeLocale();
export const isPortable = (process.env.VSCODE_PORTABLE != null);
export const platform = _getPlatform();

/**
 * Gets the current running platform.
 *
 * @throws {Error}
 */
function _getPlatform()
{
    if (isWindows)
    {
        return Platform.WINDOWS;
    }
    if (isMacintosh)
    {
        return Platform.MACINTOSH;
    }
    if (isLinux)
    {
        return Platform.LINUX;
    }
    throw new Error(localize("error.env.platform.not.supported"));
}
