import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import LiveData from "../components/home/LiveData";
import { winrateData } from "../helpers";

const winrateTiles = document.getElementsByClassName("tile-content");
Array.from(winrateTiles).forEach((tile) => {
	const winrate = +tile.getAttribute("data-winrate");
	const color = winrateData(50, winrate, 2).color;
	tile.setAttribute("style", "color:" + color + ";fill:" + color);
});

const liveData = document.getElementById("live-data");
if (liveData) {
	const render = (cardData: CardData) => {
		ReactDOM.render(
			<LiveData cardData={cardData} numCards={10} />,
			document.getElementById("live-data"),
		);
	};

	render(null);

	new CardData().load(render);
}
