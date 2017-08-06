import * as React from "react";
import * as ReactDOM from "react-dom";
import { winrateData } from "../helpers";

const winrateTiles = document.getElementsByClassName("tile-content");
Array.from(winrateTiles).forEach((tile) => {
	const winrate = +tile.getAttribute("data-winrate");
	const color = winrateData(50, winrate, 2).color;
	tile.setAttribute("style", "color:" + color + ";fill:" + color);
});

