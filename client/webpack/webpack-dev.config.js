const path = require('path');
const CompressionPlugin = require("compression-webpack-plugin");

module.exports = {
    entry: {
        game: './client/src/scripts/game.js',
        home: './client/src/scripts/home.js',
        create: './client/src/scripts/create.js',
        notFound: './client/src/scripts/notFound.js',
        howToUse: './client/src/scripts/howToUse.js',
        join: './client/src/scripts/join.js'
    },
    output: {
        path: path.resolve(__dirname, '../dist'),
        filename: "[name]-bundle.js",
    },
    plugins: [new CompressionPlugin({
        exclude: [/.map$/, /Timer_js-bundle.js$/]
    })],
    mode: "development",
    node: false,
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.m?js$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"], // ensure compatibility with older browsers
                        plugins: ["@babel/plugin-transform-object-assign"], // ensure compatibility with IE 11
                    },
                },
            },
            {
                test: /\.js$/,
                loader: "webpack-remove-debug", // remove "debug" package
            }
        ],
    },
    experiments: {
        topLevelAwait: true
    }
}
