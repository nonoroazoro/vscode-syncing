# Syncing

[![Version](https://vsmarketplacebadge.apphb.com/version/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)

*Syncing* is designed to **sync all of your VSCode settings** with GitHub Gist. [Getting started!](#user-content-getting-started) or [check out the example!](#user-content-example).

> *Keep it simple & reliable*.


## Features

In order to **keep it as simple as possible**, there will be only two features:

1. **Upload**:

    * Upload `settings, locale, snippets, keybindings, extensions`.
    * Auto separate `Mac` and `non-Mac`'s `settings` and `keybindings` in case you have multiple devices.
    * Auto create new Gist if it doesn't exist in remote.
    * Auto remove remote files if they've been removed in local.
    * Auto exclude unmodified settings to speed up the synchronization.

1. **Download**:

    * **Always overwrite** local settings.
    * Auto `install, update, remove` extensions.
    * Auto remove local files if they've been removed in remote.
    * Download settings from a public Gist by leaving the `GitHub Personal Access Token` blank (but you still have to fill in your own token before uploading).


## Commands

You can type `upload/download` (or `syncing`) in `VSCode Command Palette` to access the commands:

1. ***`Syncing: Upload Settings`***

    > Upload settings.

1. ***`Syncing: Download Settings`***

    > Download settings.

1. ***`Syncing: Open Syncing Settings`***

    > Set `GitHub Personal Access Token` and `Gist ID`.


## Keybindings

The keybindings **are disabled by default**, you can enable them by updating `VSCode Keyboard Shortcuts`:

1. for VSCode versions >= 1.11 (***recommended***):

    ![keyboard shortcuts](docs/gif/Keyboard-Shortcuts.gif)


1. for VSCode versions < 1.11, for example:

    ```json
    {
        "key": "alt+cmd+u",
        "command": "syncing.uploadSettings"
    },
    {
        "key": "alt+cmd+d",
        "command": "syncing.downloadSettings"
    },
    {
        "key": "alt+cmd+s",
        "command": "syncing.openSettings"
    }
    ```


## Proxy Settings

You can add a proxy to accelerate the synchronization, find and set the `"http.proxy"` property in `VSCode User Settings`, for example:

```json
    "http.proxy": "http://127.0.0.1:1080"
```


## Getting Started

1. Get your own `GitHub Personal Access Token`

    1. **Login to your `Settings` page.**

        ![login to settings page](docs/png/Settings.png)

    1. **Select `Personal access tokens` tab and click `Generate new token`.**

        ![generate new token](docs/png/Generate-New-Token.png)

    1. **Select `gist` and click `Generate token`.**

        ![allow gist](docs/png/Allow-Gist.png)

    1. **Copy and backup your token.**

        ![copy and backup token](docs/png/Copy-Token.png)

1. Sync your settings

    *`Syncing`* will ask for necessary information `for the first time` and `save for later use`.

    1. **Upload**

        1. Type `upload` in `VSCode Command Palette`.

            ![upload settings](docs/png/Upload-Settings.png)

        1. Enter your `GitHub Personal Access Token`.

        1. Select or enter your `Gist ID` (or `leave it blank` to create automatically).

        1. Done!

        1. After uploading, you can find your settings and the corresponding `Gist ID` in your [GitHub Gist](https://gist.github.com).

            ![gist](docs/png/Gist.png)

    1. **Download**

        1. Type `download` in `VSCode Command Palette`.

            ![download settings](docs/png/Download-Settings.png)

        1. Enter your `GitHub Personal Access Token` (or `leave it blank` if you want to download from a public Gist)

        1. Select or enter your `Gist ID` (or a `public Gist ID`).

        1. Done!

## Example

![upload example](docs/gif/Example-Upload.gif)
