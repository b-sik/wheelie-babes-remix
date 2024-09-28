const path = require("path");

module.exports = {
    mode: "development", // Use 'production' for minified output
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
        path: path.resolve(__dirname), // Output directory
    },
    devtool: "source-map", // Enable source maps for easier debugging
};
