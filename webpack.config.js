"use strict";

const path = require("path");
const webpack = require("webpack");
const BundleTracker = require("webpack-bundle-tracker");
const fs = require("fs");
const spawnSync = require("child_process").spawnSync;
const url = require("url");
const _ = require("lodash");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const exportSettings = [
	"STATIC_URL",
	"JOUST_STATIC_URL",
	"SUNWELL_URL",
	"HEARTHSTONE_ART_URL",
	"JOUST_RAVEN_DSN_PUBLIC",
	"JOUST_RAVEN_ENVIRONMENT",
	"HEARTHSTONEJSON_URL",
];
const influxKey = "INFLUX_DATABASES";
const python = process.env.PYTHON || "python";
const settingsCmd = [path.resolve(__dirname, "hsreplaynet/settings.py")];
let proc = spawnSync(python, settingsCmd.concat(exportSettings, [influxKey]), {encoding: "utf-8"});
console.log(proc.stderr);
const exportedSettings = JSON.parse(proc.stdout);

// verify exported settings are actually available
for(let key in exportSettings) {
	const setting = exportSettings[key];
	const value = exportedSettings[setting];
	if(typeof value === "undefined") {
		throw new Error("Unknown setting " + setting);
	}
}

const buildInfluxEndpoint = (db) => url.format({
	protocol: db.SSL ? "https" : "http",
	hostname: db.HOST,
	port: "" + db.PORT || 8086,
	pathname: "/write",
	query: {
		db: db.NAME,
		u: db.USER,
		p: db.PASSWORD,
		precision: "s",
	},
});

const joustDb = exportedSettings[influxKey] ? exportedSettings[influxKey]["joust"] : undefined;
const settings = exportSettings.reduce((obj, current) => {
	obj[current] = JSON.stringify(exportedSettings[current]);
	return obj;
}, {
	INFLUX_DATABASE_JOUST: joustDb ? JSON.stringify(buildInfluxEndpoint(joustDb)) : undefined,
});

module.exports = (env) => {
	env = env || {};

	// define entry points and groups with common code
	const makeEntry = (name) => path.join(__dirname, "hsreplaynet/static/scripts/src/entries/", name);
	const entries = {
		my_replays: makeEntry("my_replays"),
		replay_detail: makeEntry("replay_detail"),
		replay_embed: makeEntry("replay_embed"),
		stats: {
			card_detail: makeEntry("card_detail"),
			card_discover: makeEntry("card_discover"),
			deck_detail: makeEntry("deck_detail"),
			deck_discover: makeEntry("deck_discover"),
			my_highlights: makeEntry("my_highlights"),
			meta_overview: makeEntry("meta_overview"),
			trending: makeEntry("trending"),
		},
		archetype_analysis: makeEntry("archetype_analysis"),
		archetype_detail: makeEntry("archetype_detail"),
		my_decks: makeEntry("my_decks"),
		card_editor: makeEntry("card_editor"),
		victory_widgets: makeEntry("victory_widgets"),
		articles: makeEntry("articles"),
		premium_modal: makeEntry("premium_modal"),
		home: makeEntry("home"),
		polyfills: ["babel-polyfill", "whatwg-fetch", makeEntry("polyfills")],
	};

	// flatten the entry points for config
	const entriesFlat = {};
	const groups = [];
	for (const group in entries) {
		const values = entries[group];
		if (typeof values === "string" || Array.isArray(values)) {
			entriesFlat[group] = values;
		}
		else if (typeof values === "object") {
			groups.push(group);
			for (const key in values) {
				entriesFlat[key] = values[key];
			}
		}
	}

	// define a CommonsChunkPlugin for each group
	const commons = groups.map((group) => new webpack.optimize.CommonsChunkPlugin({
		names: group,
		chunks: Object.keys(entries[group]),
		minChunks: 3,
	}));

	entriesFlat["main"] = (path.join(__dirname, "hsreplaynet/static/styles", "main.scss"));
	const extractSCSS = new ExtractTextPlugin("main.css");

	return {
		context: __dirname,
		entry: entriesFlat,
		output: {
			path: path.join(__dirname, "build", "generated", "webpack"),
			filename: "[name].js",
		},
		resolve: {
			extensions: [".ts", ".tsx", ".js"],
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					exclude: /node_modules/,
					use: [
						{
							loader: "babel-loader",
							query: {
								presets: [
									"react",
									["es2015", {modules: false}],
								],
								cacheDirectory: env.cache && path.join(".cache", "babel-loader"),
							},
						},
						{
							loader: "ts-loader",
						},
					],
				},
				{
					test: /\.scss$/,
					use: extractSCSS.extract([
						{
							loader: "css-loader",
							options: {
								minimize: true,
							}
						},
						"sass-loader"
					])
				},
			],
		},
		externals: {
			"react": "React",
			"react-dom": "ReactDOM",
			"jquery": "jQuery",
			"joust": "Joust",
		},
		plugins: [
			new BundleTracker({path: __dirname, filename: "./build/webpack-stats.json"}),
			new webpack.DefinePlugin(settings),
			extractSCSS,
		].concat(commons),
		watchOptions: {
			// required in the Vagrant setup due to Vagrant inotify not working
			poll: 1000,
		},
	};
};
