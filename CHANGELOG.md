# Changelogs

## 3.0.12 - December 06, 2019

- Fixed: Upgrade dependencies to avoid security vulnerability.


## 3.0.9 - August 16, 2019

- Changed: Reduce the size of the extension to make it faster.


## 3.0.8 - August 12, 2019

- Fixed: Ignore the diff of function properties.


## 3.0.7 - August 08, 2019

- Fixed: Fix the messages of GitHub permission errors.


## 3.0.6 - July 30, 2019

- Fixed: Synchronize the last modified time of the settings.


## 3.0.5 - July 22, 2019

- Fixed: Upgrade dependencies to avoid security vulnerability.


## 3.0.4 - June 25, 2019

- Fixed: Upgrade dependencies to avoid security vulnerability.


## 3.0.3 - May 21, 2019

- Fixed: Fix an error in the guide.


## 3.0.2 - May 20, 2019

- Fixed: Minor fixes.


## 3.0.1 - May 10, 2019

- Changed: No longer pause auto-sync during uploading.


## 3.0.0 - May 10, 2019

- Added: Add support for settings **auto-sync**.


## 2.1.6 - April 04, 2019

- Changed: Remove unused files to reduce the extension size and improve the performance.


## 2.1.5 - April 03, 2019

- Added: Handle error during initialization.

- Added: Add Anti 996 license.

- Changed: Tweak localizations.


## 2.1.4 - March 05, 2019

- Fixed: Cannot download settings from a public Gist.

- Changed: Tweak download process, reduce interruptions.

- Changed: Replace `lodash.isstring` with local util.


## 2.1.3 - February 14, 2019

- Changed: Synchronize with the latest `octokit` api.

- Changed: Upgrade the VSCode web api to version `5.1-preview.1`.


## 2.1.2 - February 13, 2019

- Changed: Increase the download speed and accelerate the process of adding and installing VSCode extensions.


## 2.1.1 - February 12, 2019

- Added: Add support for the VSCode exploration builds.

- Added: Add support for the self-compiled version of VSCode under [the default configuration](https://github.com/Microsoft/vscode/blob/master/product.json) (Thank [@Backfighter](https://github.com/Backfighter) for the PR).


## 2.1.0 - January 30, 2019

- Added: Add support for different editions of VSCode binaries.

- Changed: Tweak the localizations.


## 2.0.7 - December 03, 2018

- Changed: Syncing will remain deactivated until you execute any of its commands.

- Fixed: Sort the extensions in alphabetical order to stabilize the settings.


## 2.0.6 - November 29, 2018

- Fixed: Fix the [issue](https://github.com/octokit/rest.js/issues/1144) introduced by `deepmerge`.


## 2.0.5 - November 29, 2018

- Changed: Replace `moment` with `date-fns` which can significantly reduce the extension's size.

- Fixed: Fix the [event-stream security issue](https://code.visualstudio.com/blogs/2018/11/26/event-stream).


## 2.0.2 - November 13, 2018

- Fixed: Fix an error while parsing VSCode settings.


## 2.0.1 - November 01, 2018

- Changed: Refactor and improve code readability (migrate from node async utilities to async functions).

- Fixed: Try not to repeatedly create the gists while uploading the settings.


## 2.0.0 - October 30, 2018

- Added: Support for `i18n (internationalization)`, and currently is shipped with `English` and `Simplified Chinese`.

- Changed: Improve the startup performance (Thank [@fabiospampinato](https://github.com/fabiospampinato) for the advice).


## 1.9.0 - September 25, 2018

- Added: Support VSCode [Portable Mode](https://code.visualstudio.com/docs/editor/portable).

- Changed: `Improve the performance` of the synchronization process, and use a new CDN to install extensions, which should significantly accelerate the synchronization.

- Changed: Simplify the `extensions.json` file.

- Fixed: Added `CaseInsensitiveMap` and `CaseInsensitiveSet` to fix the inconsistency of VSCode extension's id.


## 1.8.2 - September 12, 2018

- Added: A new setting: `syncing.separateKeybindings`, so that you can decide whether to synchronize the `keybindings` through `one single file`.

- Fixed: The diff algorithm (Thank [@agross](https://github.com/agross) for the feedback).

- Fixed: A bug of extensions auto-update function.


## 1.8.1 - July 31, 2018

- Changed: Use lowercase extension metadata.

- Changed: Narrow the scope of diff down to improve the user experience.


## 1.8.0 - July 28, 2018

- Added: Exclude VSCode extensions from being synchronized.

- Added: Automatically update your extensions during the synchronization.

- Changed: Change some settings of `Syncing` to improve the scalability.


## 1.7.3 - July 15, 2018

- Changed: README.


## 1.7.2 - July 14, 2018

- Fixed: An error during the uploading.


## 1.7.1 - July 14, 2018

- Changed: Delete the `settings-mac.json` file automatically after uploading.


## 1.7.0 - July 13, 2018

- Changed: Merge the `settings.json` and `settings-mac.json` files into one, i.e., the `settings.json` file.

- Changed: Check the `editor.formatOnSave` setting before formating the settings file during the synchronization.


## 1.6.2 - May 11, 2018

- Changed: Format `VSCode User Settings` file.

- Changed: Replace `temp` with `tmp`.

- Fixed: Automatically clean up temporary file and directory.


## 1.6.1 - May 10, 2018

- Fixed: Replace `adm-zip` with `extract-zip` to fix a bug on windows, finally!


## 1.6.0 - May 09, 2018

- Added: `README` for Simplified Chinese.

- Added: [Poka-Yoke (Mistake-Proofing)](https://en.wikipedia.org/wiki/Poka-yoke), see [#25](https://github.com/nonoroazoro/vscode-syncing/issues/25) (Thank [@christianmalek](https://github.com/christianmalek) for the advice).

- Added: Exclude VSCode settings from being synced, see [#29](https://github.com/nonoroazoro/vscode-syncing/issues/29) (Thank [@alexanderius](https://github.com/i4004) for the advice).

- Fixed: Filter out system junk files such as `.DS_Store` and `Thumbs.db`.


## 1.5.3 - February 08, 2018

- Fixed: An error introduced by VSCode 1.20.


## 1.5.2 - December 28, 2017

- Changed: Enhance user guides.

- Fixed: A bug caused by `adm-zip` on Linux Mint and Xubuntu ([Issue #21](https://github.com/nonoroazoro/vscode-syncing/issues/21)).


## 1.5.1 - December 04, 2017

- Added: Added `Breaking Changes` section in `README`.

- Changed: Simplified user guide.

- Changed: Reduced extension file size.


## 1.5.0 - December 02, 2017

- Added: Separate the `http_proxy` setting into `Syncing`'s own settings file (which means `Syncing` will no longer read proxy settings from `VSCode` settings), this may prevent a potential failure caused by wrong proxy settings while syncing between different devices (Thank [@mubaidr](https://github.com/mubaidr) for the advice).

- Added: Pick `http_proxy` settings from `http_proxy` and `https_proxy` environment variables.

- Changed: Rewrite in `TypeScript`, now we have `typings`.


## 1.4.9 - September 16, 2017

- Added: Empty extension's directory before the installation.

- Changed: Enhance user guides.


## 1.4.8 - September 14, 2017

- Revert shit: The links of getting started and example aren't working in VSCode marketplace.


## 1.4.7 - September 14, 2017

- Added: Disable upload and download commands when the synchronization is in progress.

- Changed: Validation of Gist id.

- Trying to fix shit: Getting Started and Example anchors aren't working in VSCode.


## 1.4.6 - September 14, 2017

- Fixed: Getting started link and Example link.


## 1.4.5 - September 14, 2017

- Added: Progress indicator of synchronization.

- Changed: Enhance user guides.

- Changed: Various other tweaks.


## 1.4.4 - July 17, 2017

- Fixed: Getting started link.


## 1.4.3 - July 15, 2017

- Fixed: VSCode Marketplace Link.


## 1.4.2 - July 15, 2017

- Added: Show remote Gist list when uploading/downloading for the first time, makes it easier to use. But also, low speed network will make it suffer. Please use proxy (Thank [@Henry Li](https://github.com/MagicCube) for the advice).

- Added: Add `Getting Started` in `README`.

- Changed: Tweak error handlers and toasts.


## 1.4.1 - July 12, 2017

- Changed: First attempt to change the logo.


## 1.4.0 - July 12, 2017

- Fixed: Image URLs are now resolved to `https` URLs as required by VSCode-1.14.


## 1.3.9 - June 09, 2017

- Fixed: Use extension's local version to properly remove the old extensions.


## 1.3.8 - May 15, 2017

- Changed: Tweak the timeout threshold to reduce the connection failures on slow networks.


## 1.3.7 - May 04, 2017

- Fixed: Reset keyboard-shortcuts image size.


## 1.3.6 - May 04, 2017

- Changed: Resize keyboard-shortcuts image.


## 1.3.5 - May 04, 2017

- Changed: Update guides.


## 1.3.4 - April 07, 2017

- Fixed: Minor fixes to the Downloading and Uploading features.


## 1.3.3 - March 03, 2017

- Fixed: Checking user access privileges when uploading.


## 1.3.2 - March 02, 2017

- Changed: The messages of `Settings File Not Found` and `Setting File Invalid` errors.

- Fixed: Upload an `empty array` (instead of `null`) when extension list is empty, to avoid potential error.


## 1.3.1 - February 21, 2017

- Fixed: The messages of download dialog.


## 1.3.0 - February 21, 2017

- Changed: Upload and download dialogs.

- Changed: Separate error messages of invalid GitHub Personal Access Token and Gist ID.

- Changed: Enhance user guides.


## 1.2.9 - February 08, 2017

- Added: Clean up temporary files automatically.

- Changed: Pretty JSON files: `extensions.json`, `syncing.json`, make it a little more user-friendly (Thank [@fengcen](https://github.com/fengcen) for the advice).


## 1.2.8 - December 30, 2016

- Changed: Enhance user guides.


## 1.2.7 - December 30, 2016

- Fixed: Ignore `null` content to avoid node-github error.


## 1.2.6 - November 10, 2016

- Fixed: Reload dialog isn't shown when extensions are changed.


## 1.2.5 - November 09, 2016

- Added: Hints of the synchronization.

- Added: Show reload dialog when extensions are changed.

- Added: Support download settings from public Gist.

- Fixed: Sync extensions aren't managed by VSCode.
