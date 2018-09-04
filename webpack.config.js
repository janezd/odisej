const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
//const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');

module.exports = {
    entry: ["./src/index.js"],
    mode: "development",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
        sourceMapFilename: 'bundle.map'
    },
    plugins: [
        new HtmlWebpackPlugin({
              filename: 'odyssey.html',
              inlineSource: '.(js|css)$', // embed all javascript and css inline
              template: './src/index.html'
          }),
          //new HtmlWebpackIncludeAssetsPlugin({ assets: ['./dist/'], append: true }),
          new HtmlWebpackInlineSourcePlugin(),
      ],
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
                test: /.*\.(jpe?g|png|gif|svg)$/i,
                use: [{ loader: "file-loader" }]
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"]
            }
        ]
    }
}
