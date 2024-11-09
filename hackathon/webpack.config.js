const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');
const VersionFile = require('webpack-version-file');

module.exports = {
    entry: './src/index.js',
    plugins: [
        new VersionFile({
            output: 'public/dist/version.txt',
            // package: './package.json'
        })
    ],
    module: {
        rules: [
          {
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
          },
        ],
      },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'public/dist'),
    },
    
};