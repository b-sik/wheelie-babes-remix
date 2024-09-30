const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = {
    mode: process.env.NODE_ENV || "development", // Use 'production' for minified output
    entry: "./index.ts", // Your entry file
    module: {
        rules: [
            {
                test: /\.tsx?$/, // Regex to match .ts and .tsx files
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts"], // Resolve these extensions
    },
    output: {
        filename: "index.js", // Output file name
        path: path.resolve(__dirname) + "/static", // Output directory
    },
    devtool: "source-map", // Enable source maps for easier debugging
    plugins: [new Dotenv()],
};
