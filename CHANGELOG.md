# Changelogs

## May 4, 2017 (version 1.3.5)

- ENHANCE: Update guides.

## April 7, 2017 (version 1.3.4)

- FIX: Minor fixes to the Downloading and Uploading features.

## March 3, 2017 (version 1.3.3)

- FIX: Check the user's access privileges when uploading.

## March 2, 2017 (version 1.3.2)

- ENHANCE: Update the messages of `Settings File Not Found` and `Setting File Invalid` errors.
- ENHANCE: Upload an `empty array` (instead of `null`) when extension list is empty, to avoid potential error.

## February 21, 2017 (version 1.3.1)

- FIX: Message error of Download dialog.

## February 21, 2017 (version 1.3.0)

- ENHANCE: Upload and Download dialogs.
- ENHANCE: Separate error messages of invalid GitHub Personal Access Token and Gist ID.
- ENHANCE: Update guides.

## February 8, 2017 (version 1.2.9)

- ENHANCE: Clean up temporary files automatically.
- ENHANCE: Pretty JSON files: `extensions.json`, `syncing.json`, make it a little more user-friendly (Thanks [@fengcen](https://github.com/fengcen) for the advice).

## December 30, 2016 (version 1.2.8)

- ENHANCE: Update READMEs.

## December 30, 2016 (version 1.2.7)

- FIX: Ignore `null` content to avoid node-github error.

## November 10, 2016 (version 1.2.6)

- FIX: Don't show reload dialog when extensions aren't changed.

## November 9, 2016 (version 1.2.5)

- ADD: Hints of the synchronization.
- ADD: Reload dialog when extensions are changed.
- ADD: Support download settings from public Gist.
- FIX: Synced extensions aren't managed by vscode.
