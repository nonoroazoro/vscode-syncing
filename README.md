# Syncing - VSCode Extension
[![Version](http://vsmarketplacebadge.apphb.com/version/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Installs](http://vsmarketplacebadge.apphb.com/installs/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/nonoroazoro.syncing.svg)](https://vsmarketplacebadge.apphb.com/rating/nonoroazoro.syncing.svg)


**"Syncing"** is a VSCode extension, proposed to sync VSCode's settings (**including extensions**) to GitHub Gist.

> I wrote it cause I wanna keep it **simple**.


## Features

**In order to keep this extension as simple as possible, there will be no other features, only these two:**

1. **Upload** VSCode settings and extensions to Gist (auto create new Gist for the first time).
2. **Download** VSCode settings and extensions from Gist.


## Extension Commands

**Type `syncing` (or just `upload/download`) in VSCode Command Palette to:**

* `Syncing: Upload Settings`
* `Syncing: Download Settings`
* `Syncing: Open Syncing Settings`


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


## About GitHub Access Token and Gist ID

1. **generate new token**

    ![generate new token](./docs/1.png?raw=true "generate new token")

2. **allow gist**

    ![allow gist](./docs/2.png?raw=true "allow gist")

3. **copy/backup token**

    ![copy/backup token](./docs/3.png?raw=true "copy/backup token")

4. **after uploading, you can check your settings and Gist ID in Gist**

    ![gist](./docs/4.png?raw=true "gist")
