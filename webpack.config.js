const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
//const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

const commonConfig = {
    mode: "development",
    devtool: "#source-map",
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader',
                query: {
                    presets: ['env', 'stage-2', 'react']
                }
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            }
        ]
    }
}

const creatorBundle = {
    ...commonConfig,
    entry: ["./src/index.js"],
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
        sourceMapFilename: 'bundle.map'
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'odyssey.html',
            inlineSource: '.(js|css)$',
            template: './src/index.html'
        }),
        new HtmlWebpackInlineSourcePlugin(),
    ],
}

const gameBundle = {
    ...commonConfig,
    entry: ["./src/play.js"],
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "gamebundle.js",
        sourceMapFilename: 'gamebundle.map'
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'play.html',
            inlineSource: '.(js|css)$',
            template: './src/index.html'
        }),
        new HtmlWebpackInlineSourcePlugin(),
    ],
}

module.exports = [creatorBundle, gameBundle]
