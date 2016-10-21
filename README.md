# syncing - VSCode Extension

**"syncing"** is a VSCode extension, proposed to sync VSCode's settings (**include extensions**) to GitHub Gist.

## Features

**In order to keep this extension as simple as possible, there will be no other features, just these two:**

1. Upload VSCode settings and extensions to Gist (auto create new Gist for the first time).
2. Download VSCode settings and extensions from Gist.


## Extension Commands

**Type `>Syncing` in VSCode Command Palette to:**

* `Upload VSCode Settings`
* `Download VSCode Settings`


## Extension Keybindings

The keybindings are **disabled by default**, but you can enable them by updating VSCode's `Keyboard Shortcuts`:

```javascript
{
    "key": "",
    "command": "syncing.uploadSettings"
},
{
    "key": "",
    "command": "syncing.downloadSettings"
}
```

## About GitHub Access Token and Gist ID

1. **generate new token**
  ![generate new token](./docs/1.png "generate new token")

2. **allow gist**
  ![allow gist](./docs/2.png "allow gist")

3. **copy/backup token**
  ![copy/backup token](./docs/3.png "copy/backup token")

4. **after uploading, you can check your settings and Gist ID in Gist**
  ![gist](./docs/4.png "gist")
