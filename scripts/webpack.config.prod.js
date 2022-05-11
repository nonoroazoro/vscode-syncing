const fs = require("fs");
const path = require("path");
const ESLintPlugin = require("eslint-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const Webpackbar = require("webpackbar");

const ROOT_PATH = fs.realpathSync(process.cwd());
const BUILD_PATH = path.join(ROOT_PATH, "dist");

// See https://github.com/microsoft/vscode/blob/main/extensions/shared.webpack.config.js
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
    optimization: {
        minimizer: [
            new TerserPlugin({
                extractComments: false,
                terserOptions: {
                    format: { comments: false }
                }
            })
        ]
    },
    output: {
        path: BUILD_PATH,
        filename: "[name].js",
        libraryTarget: "commonjs"
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            // "universal-user-agent$": "universal-user-agent/dist-node/index.js"
        }
    },
    externals: {
        "vscode": "commonjs vscode"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
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
    plugins: [
        new ESLintPlugin(),
        new ForkTsCheckerWebpackPlugin(),
        new Webpackbar()
    ],
    stats: {
        children: false,
        modules: false
    }
};
