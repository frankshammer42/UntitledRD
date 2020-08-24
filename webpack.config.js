const path = require('path');
const webpack = require('webpack');
const index = "index";
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './'+index+'.js',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: index + '.js'
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
        },
        {
            test: /\.glsl$/,
            use: 'raw-loader'
        },
        {
            test: /\.(mov|mp4|jpe?g|png|gif|svg)$/i,
            loader: ['file-loader'],
        },
        {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader']
        },
        {
            test: /\.(ogg|mp3|wav|mpe?g)$/i,
            loader: ['file-loader'],
        }
        ]
    },
    stats: {
        colors: true
    },
    watch: false,
    watchOptions: {
        aggregateTimeout: 300,
        ignored: "/node_modules/"
    },
    devServer: {
        contentBase: path.join(__dirname, 'build'),
        compress: true,
        port: 3000 
    },
    mode: 'development'
};
