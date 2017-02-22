"use strict";

const path = require("path");
const webpack = require("webpack");
const BundleTracker = require("webpack-bundle-tracker");
const fs = require("fs");
const spawnSync = require("child_process").spawnSync;
const url = require("url");
const _ = require("lodash");


const exportSettings = [
	"STATIC_URL",
	"JOUST_STATIC_URL",
	"HEARTHSTONE_ART_URL",
	"JOUST_RAVEN_DSN_PUBLIC",
	"JOUST_RAVEN_ENVIRONMENT",
	"HEARTHSTONEJSON_URL",
];
const influxKey = "INFLUX_DATABASES";
const python = process.env.PYTHON || "python";
const manageCmd = [path.resolve(__dirname, "./manage.py"), "show_settings"];
const exportedSettings = JSON.parse(
	spawnSync(python, manageCmd.concat(exportSettings, [influxKey]), {encoding: "utf-8"}).stdout
);

const db = exportedSettings[influxKey] ? exportedSettings[influxKey]["joust"] : undefined;
const settings = exportSettings.reduce((obj, current) => {
	obj[current] = JSON.stringify(exportedSettings[current]);
	return obj;
}, {
	INFLUX_DATABASE_JOUST: db ? JSON.stringify(url.format({
		protocol: db.SSL ? "https" : "http",
		hostname: db.HOST,
		port: "" + db.PORT || 8086,
		pathname: "/write",
		query: {
			db: db.NAME,
			u: db.USER,
			p: db.PASSWORD,
			precision: "s",
		}
	})) : undefined
});

const entry = (name) => {
	return [
		"es6-promise/auto", // Promise polyfill (required for fetch)
		"whatwg-fetch", // fetch polyfill
		path.join(__dirname, "hsreplaynet/static/scripts/src/entries/", name),
	];
};

module.exports = {
	context: __dirname,
	entry: {
		my_replays: entry("my_replays"),
		replay_detail: entry("replay_detail"),
		replay_embed: entry("replay_embed"),
		archetypes: entry("archetypes"),
		victory_widgets: entry("victory_widgets"),
		card_detail: entry("card_detail"),
		popular_cards: entry("popular_cards"),
		deck_detail: entry("deck_detail"),
		card_discover: entry("card_discover"),
		deck_discover: entry("deck_discover"),
	},
	output: {
		path: path.resolve(__dirname, "./build/generated/webpack"),
		filename: "[name].js",
	},
	resolve: {
		modulesDirectories: ["node_modules"],
		extensions: ["", ".js", ".jsx", ".d.ts", ".ts", ".tsx"],
	},
	module: {
		loaders: [
			{
				test: /\.tsx?$/,
				loaders: [
					"babel-loader?presets[]=react&presets[]=es2015",
					"ts-loader",
				],
			}
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
	],
	watchOptions: {
		// required in the Vagrant setup due to Vagrant inotify not working
		poll: true
	},
};
