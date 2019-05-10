const path = require("path");

const BUILD_PATH = path.join(__dirname, "./dist");

// See https://github.com/Microsoft/vscode/blob/master/extensions/shared.webpack.config.js
module.exports = {
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
        extensions: [".ts", ".js"],
        alias: {
            "is-plain-object$": "is-plain-object/index.cjs.js"
        }
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
    stats: {
        children: false,
        modules: false
    }
};
