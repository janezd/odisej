const path = require('path');

module.exports = {
    entry: ["./src/index.js", "./src/index.html"],
    mode: "development",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
        sourceMapFilename: 'bundle.map'
    },
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
                test: /\.html/,
                loader: 'file-loader?name=[name].[ext]',
            },
        ]
    }
}
