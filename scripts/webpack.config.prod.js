const fs = require("fs");
const path = require("path");
const Webpackbar = require("webpackbar");

const ROOT_PATH = fs.realpathSync(process.cwd());
const BUILD_PATH = path.join(ROOT_PATH, "dist");

// See https://github.com/Microsoft/vscode/blob/master/extensions/shared.webpack.config.js
module.exports = {
    context: ROOT_PATH,
    mode: "production",
    target: "node",
    node: {
        __dirname: false
    },
    entry: {
        extension: ["./src/extension"]
    },
    output: {
        path: BUILD_PATH,
        filename: "[name].js",
        libraryTarget: "commonjs"
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    externals: {
        "vscode": "commonjs vscode"
    },
    module: {
        rules: [
            {
                enforce: "pre",
                test: /\.ts$/,
                loader: "eslint-loader",
                options: { cache: true },
                exclude: /node_modules/
            },
            {
                test: /\.ts$/,
                use: [
                    "cache-loader",
                    {
                        loader: "ts-loader",
                        options: { transpileOnly: true }
                    }
                ],
                exclude: /node_modules/
            },
            {
                test: /\.node$/,
                use: "native-ext-loader"
            }
        ]
    },
    plugins: [new Webpackbar()],
    stats: {
        children: false,
        modules: false
    }
};
