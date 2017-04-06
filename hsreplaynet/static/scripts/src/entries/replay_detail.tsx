import * as React from "react";
import * as ReactDOM from "react-dom";
import ShareGameDialog from "../components/ShareGameDialog";
import JoustEmbedder from "../JoustEmbedder";
import MetricsReporter from "../metrics/MetricsReporter";
import BatchingMiddleware from "../metrics/BatchingMiddleware";
import InfluxMetricsBackend from "../metrics/InfluxMetricsBackend";
import VisibilityDropdown from "../components/VisibilityDropdown";
import {Visibility} from "../interfaces";
import DeleteReplayButton from "../components/DeleteReplayButton";
import PlayerInfo from "../components/PlayerInfo";
import UserData from "../UserData";
import CardData from "../CardData";

// shortid
let shortid = document.getElementById("replay-infobox").getAttribute("data-shortid");

// Joust
let embedder = new JoustEmbedder();

const container = document.getElementById("joust-container");
const startPaused = container.getAttribute("data-autoplay") == "false";
if (container.hasAttribute("data-locale")) {
	embedder.locale = container.getAttribute("data-locale");
}

// shared url decoding
if (location.hash) {
	var ret = location.hash.match(/turn=(\d+)(a|b)/);
	if (ret) {
		embedder.turn = ((+ret[1]) * 2) + (+(ret[2] == "b")) - 1;
	}
	ret = location.hash.match(/reveal=(0|1)/);
	if (ret) {
		embedder.reveal = (+ret[1] === 1);
	}
	ret = location.hash.match(/swap=(0|1)/);
	if (ret) {
		embedder.swap = (+ret[1] === 1);
	}
}

// share dialog
let metrics: MetricsReporter = null;
let endpoint = INFLUX_DATABASE_JOUST;
if (endpoint) {
	metrics = new MetricsReporter(
		new BatchingMiddleware(new InfluxMetricsBackend(endpoint)),
		(series: string): string => "hsreplaynet_" + series,
	);
}
let shared = {};

function renderShareDialog() {
	ReactDOM.render(
		<ShareGameDialog
			url={document.getElementById("share-game-dialog").getAttribute("data-url")}
			showLinkToTurn={true}
			showPreservePerspective={false}
			turn={embedder.turn}
			reveal={embedder.reveal}
			swap={embedder.swap}
			onShare={(network: string, linkToTurn: boolean) => {
				if (!metrics) {
					return;
				}
				if (shared[network]) {
					// deduplicate
					return;
				}
				metrics.writePoint("shares", {count: 1, link_to_turn: linkToTurn}, {network: network});
				shared[network] = true;
			}}
		/>,
		document.getElementById("share-game-dialog"),
	);
}

renderShareDialog();
embedder.onTurn = () => renderShareDialog();
embedder.onToggleReveal = () => renderShareDialog();
embedder.onToggleSwap = () => renderShareDialog();
embedder.prepare(container);

// privacy dropodown
let visibilityTarget = document.getElementById("replay-visibility");
if (visibilityTarget) {
	let status = +visibilityTarget.getAttribute("data-selected") as Visibility;
	ReactDOM.render(
		<VisibilityDropdown
			initial={status}
			shortid={shortid}
		/>,
		visibilityTarget,
	);
}

// delete link
let deleteTarget = document.getElementById("replay-delete");
if (deleteTarget) {
	let redirect = deleteTarget.getAttribute("data-redirect");
	ReactDOM.render(
		<DeleteReplayButton
			shortid={shortid}
			done={() => window.location.href = redirect} />,
		deleteTarget,
	);
}

// Player info
const playerInfo = document.getElementById("infobox-players-container");
const user = new UserData();
if (playerInfo) {
	const gameId = playerInfo.getAttribute("data-game-id");
	const playerName = playerInfo.getAttribute("data-player-name");
	const opponentName = playerInfo.getAttribute("data-opponent-name");
	const build = +playerInfo.getAttribute("data-build");
	const renderPlayerInfo = (cards?) => {
		ReactDOM.render(
			<PlayerInfo
				gameId={gameId}
				playerName={playerName}
				opponentName={opponentName}
				build={build}
				user={user}
				cards={cards}
			/>,
			playerInfo,
		);
	};
	renderPlayerInfo();
	new CardData().load((cards) => {
		renderPlayerInfo(cards);
	})
}

// fullscreen button for mobile
let wasPlaying = !startPaused;
let first = true;
const toggleButton = document.getElementById("replay-toggle-container");

ReactDOM.render(
	embedder.launcher ?
		<button className="btn btn-primary btn-full visible-xs" type="button" onClick={() => {
			first = false;
			container.classList.remove("hidden-xs");
			embedder.launcher.fullscreen(true);
		}}>
			Enter Replay
		</button> :
		<button className="btn btn-danger btn-full visible-xs" type="button" onClick={() => {
			alert([
				"Something went wrong when trying to initialize our Replay applet (Joust).",
				"Please ensure you have no plugins blocking it, such as Adblockers or NoScript.",
				"Otherwise try opening this replay on another device.",
			].join(" "));
		}}>
			Something went wrong…
		</button>,
	toggleButton,
);

const style = typeof window.getComputedStyle === "function" ? window.getComputedStyle(container) : {};
if (style["display"] == "none") {
	embedder.launcher.startPaused(true);
}

embedder.launcher.onFullscreen((fullscreen: boolean): void => {
	if (fullscreen) {
		if (wasPlaying) {
			embedder.launcher.play();
		}
	}
	else {
		// leave fullscreen
		wasPlaying = embedder.launcher.playing;
		embedder.launcher.pause();
		container.classList.add("hidden-xs");
	}
});

// embed joust
embedder.render();
