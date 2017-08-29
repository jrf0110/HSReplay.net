var webpack = require("webpack");
var path = require("path");

module.exports = (env) => ({
	entry: {
		"vendor": [
			"react",
			"react-dom",
			"victory",
			"react-virtualized",
			"lodash",
			"whatwg-fetch",
			"deckstrings",
			"hearthstonejson",
		],
	},
	output: {
		path: path.join(__dirname, "build", "cache"),
		filename: "[name].dll.js",
		library: "[name]_[hash]",
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "build", "cache", "[name]-manifest.json"),
			name: "[name]_[hash]",
		}),
	],
});
