# Syncing

[![Version](https://vsmarketplacebadge.apphb.com/version/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing#review-details)

[English](README.md) | [中文](README.zh-CN.md)

***Syncing*** *([View Source Code](https://github.com/nonoroazoro/vscode-syncing))* is a VSCode extension, designed to **sync all of your VSCode settings across multiple devices** with GitHub Gist.

[Getting started](#getting-started) or [check out the examples](#examples).

> *Keep it simple & reliable!*


## Breaking Changes

* From ***version 1.6.0*** onwards, I've introduced two important changes:

    1. **Exclude VSCode Settings.**

    1. **Mistake-Proofing ([Poka-Yoke](https://en.wikipedia.org/wiki/Poka-yoke)).**

    > Please [check out the VSCode Settings](#vscode-settings) for more details.


## Features

*Syncing* will `keep the consistency of your VSCode settings between local and remote`, and let you:

1. **Upload VSCode Settings**:

    * It will upload the `settings, keybindings, extensions, locales` and `snippets`.
    * The `settings` and `keybindings` of `Macintosh` and `non-Macintosh` will be synced separately, in case you have multiple devices.
    * Automatically create a new Gist to store your settings.
    * Use an incremental algorithm to boost the synchronization.
    * You can `exclude some VSCode settings` from being uploaded, [check out the VSCode Settings](#vscode-settings) for more details.

1. **Download VSCode Settings**:

    * **Always overwrite** local settings.
    * Automatically `install, update` and `remove` extensions.
    * You can leave the `GitHub Personal Access Token` blank to download from `a public Gist`, e.g., your friend's VSCode settings.
    * You can `exclude some VSCode settings` from being downloaded, [check out the VSCode Settings](#vscode-settings) for more details.

Besides, you can [set up a proxy](#proxy-settings) to accelerate the synchronization. And of cause, you'll have a `progress indicator` during the synchronization :).


## Commands

You can type `"upload"`, `"download"` (or `"syncing"`) in `VSCode Command Palette` to access these commands:

1. ***`Syncing: Upload Settings`***

    > Upload settings to GitHub Gist.

1. ***`Syncing: Download Settings`***

    > Download settings from GitHub Gist.

1. ***`Syncing: Open Syncing Settings`***

    > Set your `GitHub Personal Access Token`, `Gist ID` and `HTTP Proxy` settings.


## Keybindings

The keybindings **are unassigned by default**, but you can easily turn them on by updating `VSCode Keyboard Shortcuts`:

1. For VSCode versions >= 1.11 (***recommended***):

    ![keyboard shortcuts](docs/gif/Keyboard-Shortcuts.gif)

1. For VSCode versions < 1.11, for example:

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


## VSCode Settings

You can find these in `VSCode settings`, and these will also be synced through your devices.

1. ***`syncing.upload.exclude`***

    The new `syncing.upload.exclude` setting is added to the `VSCode settings`. Now you can configure [glob patterns](https://github.com/isaacs/minimatch) for excluding VSCode settings from being synced.

    Take this for example:

    ```json
    "syncing.upload.exclude" : [
        "editor.*",
        "workbench.colorTheme"
    ]
    ```

    Now the `workbench.colorTheme` setting and all the settings of `editor` will no longer be synced.

1. ***`syncing.pokaYokeThreshold`***

    The new `syncing.pokaYokeThreshold` setting is added to the `VSCode settings`.

    ```json
    "syncing.pokaYokeThreshold" : 10
    ```

    From now on, each time you start a synchronization, `Syncing` will display a `confirm dialog` if the changes between the local and remote setting exceed the threshold.

    The default value of this setting is `10`, and you can disable this feature by setting to a number `less than or equal to zero` (`<= 0`).


## Proxy Settings

You can set up a proxy to accelerate the synchronization (From ***version 1.5.0*** onwards, `Syncing` will no longer read `http.proxy` from `VSCode settings`). Here are the steps:

1. Type `"Syncing: Open Syncing Settings"` (or just `"opensync"`) in `VSCode Command Palette` to open `Syncing`'s own settings file.

1. Set the `"http_proxy"` property, for example:

    ```json
    "http_proxy": "http://127.0.0.1:1080"
    ```

Moreover, if you don't set `"http_proxy"`, `Syncing` will try to use the `http_proxy` and `https_proxy` environment variables.

> Please notice that `Syncing` **does not upload** its own settings file (i.e. `syncing.json`) because it may contain your sensitive information.


## Getting Started

1. Get your own `GitHub Personal Access Token` (3 steps).

    1. Login to your **[GitHub Personal Access Tokens page](https://github.com/settings/tokens)** and click **`Generate new token`**.

        ![generate new token](docs/png/Generate-New-Token.png)

    1. Give your token a descriptive **`name`**, check **`gist`** and click **`Generate token`**.

        ![allow gist](docs/png/Allow-Gist.png)

    1. **`Copy`** and **`backup`** your token.

        ![copy and backup token](docs/png/Copy-Token.png)

1. Sync your VSCode settings.

    *`Syncing`* will ask for necessary information `for the first time` and `save for later use`.

    1. **Upload**

        1. Type `upload` in `VSCode Command Palette`.

            ![upload settings](docs/png/Upload-Settings.png)

        1. Enter your `GitHub Personal Access Token`.

        1. Select or enter your `Gist ID`.

            > You can `leave it blank` to create a new `Gist` automatically.

        1. Done!

        1. *After it's done, you can find the settings and the corresponding `Gist ID` in your [GitHub Gist](https://gist.github.com). Also, you can `Edit` and `make it public` to share your settings with others.*

    1. **Download**

        1. Type `download` in `VSCode Command Palette`.

            ![download settings](docs/png/Download-Settings.png)

        1. Enter your `GitHub Personal Access Token`.

            > You can `leave it blank` if you want to download from a `public Gist`.

        1. Select or enter your `Gist ID` or a `public Gist ID`.

        1. Done!


## Examples

1. Upload:

    ![upload example](docs/gif/Example-Upload.gif)

1. Download:

    ![download example](docs/gif/Example-Download.gif)
