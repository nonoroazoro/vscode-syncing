# syncing - VSCode Extension

**"syncing"** is a VSCode extension, proposed to sync VSCode's settings (**include extensions**) to GitHub Gist.

## Features

**In order to keep this extension as simple as possible, there will be no other features, just these two:**

1. Upload VSCode settings and extensions to Gist.
2. Download VSCode settings and extensions from Gist.


## Extension Commands

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
