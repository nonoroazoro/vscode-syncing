# Syncing

[![Version](https://vsmarketplacebadge.apphb.com/version/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/nonoroazoro.syncing.svg)](https://marketplace.visualstudio.com/items?itemName=nonoroazoro.syncing#review-details)

[English](README.md) | [中文](README.zh-CN.md)

**Syncing** *([源码](https://github.com/nonoroazoro/vscode-syncing))* 是一个 VSCode 插件，它能在**多台设备之间同步你的所有 VSCode 配置**（借助了 [GitHub Gist](https://gist.github.com)，嘿嘿）。

[点击这里](#快速开始)快速开始配置吧，当然你也可以先看看[示例](#示例)哦。

> ***简单可靠**就是这个插件的唯一追求了。。。所以提需求别太过分了啊 :)*


## 重要变更

* `Syncing` 从 ***1.6.0*** 版本开始将会带来以下两个重要变更：

    1. **在同步时允许忽略指定的 VSCode 配置项；**

    1. **加入了[防呆设计](https://zh.wikipedia.org/wiki/%E9%98%B2%E5%91%86)。**

    > 具体请参考 `Syncing` 新增的 [VSCode 配置项](#vscode-配置项)。


## 功能

*Syncing* 可以在`本地和云端之间同步你的所有 VSCode 配置`，包括：

1. **上传 VSCode 配置**:

    * 上传的配置包括： `settings, keybindings, extensions, locales` 以及所有 `snippets`；
    * 因为 `Mac` 和`非 Mac` 设备的配置通常会有一些差异，所以 `settings` 和 `keybindings` 将会按照设备类型分别上传；
    * 自动帮你创建新的 `Gist` 来保存 VSCode 配置，例如当你第一次使用这个插件上传配置时；
    * 为了加快同步速度，整个同步过程都是`增量`的；
    * 你可以`忽略某些 VSCode 配置项`，以防止它们被上传，具体请参考[这里](#vscode-配置项)。

1. **下载 VSCode 配置**:

    * 请注意，下载配置时会**覆盖**你的本地配置（即以云端为准，精确同步，甚至连插件版本号都会保持一致）；
    * 自动帮你`安装`、`升级`和`删除`插件；
    * 你可以从一个`公开的 Gist` 中下载配置。例如，下载你朋友分享的配置，只需要问他要一个 `Gist ID` 就行了，具体请参考[这里](#快速开始)；
    * 你可以`忽略某些 VSCode 配置项`，以防止它们被下载，具体请参考[这里](#vscode-配置项)。

另外，如果你访问 GitHub 有困难（万恶的墙），你可以[配置一个代理](#代理设置)来加速同步。当然，同步时的`进度条`肯定是会有的！


## 命令

在 `VSCode 的命令面板`中，你可以输入 `upload`、`download`（或者 `syncing`）来快速搜索和执行 `Syncing` 的所有命令。

1. ***`Syncing: Upload Settings`***

    > 上传配置到 GitHub Gist。

1. ***`Syncing: Download Settings`***

    > 从 GitHub Gist 下载配置。

1. ***`Syncing: Open Syncing Settings`***

    > 设置 `GitHub Personal Access Token`、`Gist ID` 或`代理`。


## 快捷键

**默认情况下所有的快捷键都是关闭的**，但是你可以很轻松的在 `VSCode 键盘快捷方式`中指定你想要的快捷键：

1. 如果你的 VSCode 版本`高于 1.11`（***这是可视化的配置，强烈推荐***）:

    ![keyboard shortcuts](docs/gif/Keyboard-Shortcuts.gif)

1. 如果你的 VSCode 版本`低于 1.11`，那就只能手动配置啦，参考一下：

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


## VSCode 配置项

从 ***1.6.0*** 版本开始，`Syncing` 在 `VSCode 用户设置`中新增了以下两个配置项。

1. ***`syncing.upload.exclude`***

    通过这个配置项，你可以`忽略某些指定的 VSCode 配置项`，以防止它们被同步。当然其他配置项不受影响，依然会正常同步。

    > 配置规则可以参考 [Glob Patterns](https://github.com/isaacs/minimatch)。同时，不在这个规则中的 VSCode 配置项依然会被正常同步。

    举个栗子：

    ```json
    "syncing.upload.exclude" : [
        "editor.*",
        "workbench.colorTheme"
    ]
    ```

    这样一来你的 VSCode 主题（`workbench.colorTheme`）以及所有与编辑器（`editor`）相关的配置项就不会再被同步啦。

1. ***`syncing.pokaYokeThreshold`***

    同步配置时，`Syncing` 会检查你的本地和云端配置间的`差异数量`，如果超出这个阈值，就会显示一个确认对话框，以防错误的覆盖你的配置。

    这个配置项的默认值是 `10`，当然你也可以将其设置为一个`小于等于 0 的值`来关闭这个功能（不再检查和显示确认对话框）。

    举个栗子：

    ```json
    "syncing.pokaYokeThreshold" : 10
    ```

    这样一来每次你同步时，`Syncing` 都会检查本地和云端的配置差异量，并决定是否需要向你显示确认对话框。


## 代理设置

如果你访问 GitHub 有困难，比如在国内有万恶的墙，你可以配置一个代理来加速同步，具体步骤如下：

1. 在 `VSCode 的命令面板`中输入 `Syncing: Open Syncing Settings`（或者 `opensync`）来打开 `Syncing` 自己的配置文件（即 `syncing.json` 文件）；

1. 修改 `http_proxy` 的值（从 ***1.5.0*** 版本开始，`Syncing` 将不再从 `VSCode 用户设置`中读取 `http.proxy`，改为使用这个这个配置项），例如：

    ```json
    "http_proxy": "http://127.0.0.1:1080"
    ```

这样就好啦。另外，如果你不想在这里配置代理，那么 `Syncing` 也会尝试从系统环境中读取 `http_proxy` 和 `https_proxy` 作为代理设置。

> 注意：不同于那些保存在 `VSCode 用户设置`中的 `Syncing` 配置项，这个独立的配置文件并**不会被同步**，因为里面保存了你的私人信息。


## 快速开始

1. 创建你自己的 `GitHub Personal Access Token`（总共 3 步）：

    1. 登录到你的 **[GitHub Personal Access Tokens 页面](https://github.com/settings/tokens)**，点击 **`Generate new token`**；

        ![generate new token](docs/png/Generate-New-Token.png)

    1. 指定一个 **`name`**，然后勾选 **`gist`**，最后点击 **`Generate token`**；

        ![allow gist](docs/png/Allow-Gist.png)

    1. 点击 **`Copy`** 并且 **`备份`** 你的 Token。

        ![copy and backup token](docs/png/Copy-Token.png)

1. 同步你的 VSCode 配置：

    在第一次使用时，`Syncing` 会向你询问一些必要的信息并保存下来以供后续使用，主要就是前面申请的 `GitHub Personal Access Token` 啦。

    1. **上传配置**

        1. 在 `VSCode 的命令面板` 中输入 `upload`；

            ![upload settings](docs/png/Upload-Settings.png)

        1. 填写刚才申请的 `GitHub Personal Access Token`；

        1. 在下拉框中选择或者手动输入一个 `Gist ID`；

            > 你可以留空，那样的话 `Syncing` 会自动帮你创建一个新的 `Gist`。

        1. 完成！

        1. *在上传完成后，你可以在 [GitHub Gist](https://gist.github.com) 中找到对应的 `Gist` 和 `Gist ID`。当然你也可以通过 `Edit` 和 `make it public` 操作将你的配置共享给其他人。*

    1. **下载配置**

        1. 在 `VSCode 的命令面板` 中输入 `download`；

            ![download settings](docs/png/Download-Settings.png)

        1. 填写你的 `GitHub Personal Access Token`；

            > 你可以留空，那样的话就能从一个`公开的 Gist`（比如你朋友共享给你的 `Gist`）来下载配置了。

        1. 在下拉框中选择或者手动输入一个 `Gist ID`（当然这里也可以输入一个`公开的 Gist ID`）。

        1. 完成！


## 示例

1. 上传配置：

    ![upload example](docs/gif/Example-Upload.gif)

1. 下载配置：

    ![download example](docs/gif/Example-Download.gif)
