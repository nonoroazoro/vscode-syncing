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
        libraryTarget: "commonjs",
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            deepmerge$: 'deepmerge/dist/umd.js',
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
                        loader: "ts-loader"
                    }
                ],
                exclude: /node_modules/
            }
        ]
    },
    stats: {
        children: false,
        modules: false
    }
};
