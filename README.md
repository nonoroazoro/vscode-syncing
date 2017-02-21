# Syncing

[![Version](http://vsmarketplacebadge.apphb.com/version/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Installs](http://vsmarketplacebadge.apphb.com/installs/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/nonoroazoro.syncing.svg)](https://vsmarketplacebadge.apphb.com/rating/nonoroazoro.syncing.svg)

**Syncing** is a VSCode extension, proposed to sync **all of the VSCode's settings** to GitHub Gist.

> To keep the synchronization **simple & reliable**.


## Features

**In order to keep this extension as simple as possible, there will be no other features, only these 2:**

1. **Upload** VSCode settings and extensions to Gist:

    * **upload** `settings`, `locale`, `snippets`, `keybindings`, `extensions`.
    * **auto separate Mac and non-Mac**'s `settings` and `keybindings` (in case you have multiple devices).
    * auto create new Gist if it is not found in remote.
    * auto remove remote files when they're removed in local.
    * auto exclude unchanged settings (to speed up the synchronization).

1. **Download** VSCode settings and extensions from Gist.

    * **always overwrite** local settings.
    * auto `install`, `update`, `remove` extensions.
    * auto remove local files when they're removed in remote.
    * you can leave out the `GitHub Personal Access Token` blank to `download settings from a public Gist` (and don't forget to add your own GitHub token before uploading your settings :grimacing:).


## Extension Commands

There're **`3 commands`** in this extension.

Type `syncing` (or just `upload/download`) in VSCode Command Palette to:

* **`Syncing: Upload Settings`**
* **`Syncing: Download Settings`**

Also, you can change your `GitHub Token` or `Gist ID` by:

* **`Syncing: Open Syncing Settings`**


## Extension Keybindings

The keybindings are **not set by default**, but you can enable them by updating VSCode's `Keyboard Shortcuts`:

```javascript
    {
        "key": "",
        "command": "syncing.uploadSettings"
    },
    {
        "key": "",
        "command": "syncing.downloadSettings"
    },
    {
        "key": "",
        "command": "syncing.openSettings"
    }
```


## Extension Proxy Settings

You can add a proxy to accelerate the synchronization, find and set the `"http.proxy"` property in VSCode `User Settings` like:

```javascript
    // HTTP
    // The proxy setting to use. If not set will be taken from the http_proxy and https_proxy environment variables
    "http.proxy": "http://127.0.0.1:1080"
```


## Get Your Own GitHub Personal Access Token and Gist ID

1. **login to your `Settings` page**

    ![generate new token](./docs/0.png?raw=true "settings page")

1. **select `Personal access tokens` tab and generate new token**

    ![generate new token](./docs/1.png?raw=true "generate new token")

1. **allow gist**

    ![allow gist](./docs/2.png?raw=true "allow gist")

1. **copy/backup your token**

    ![copy/backup token](./docs/3.png?raw=true "copy/backup your token")

1. **after uploading, you can find the settings and the corresponding Gist ID in your GitHub Gist**

    ![gist](./docs/4.png?raw=true "gist")
