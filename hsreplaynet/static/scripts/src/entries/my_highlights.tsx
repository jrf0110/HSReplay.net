import * as React from "react";
import * as ReactDOM from "react-dom";
import {image, cardArt} from "../helpers";
import MyHighlights from "../pages/MyHighlights";


import HearthstoneJSON from "hearthstonejson";

const render = (cardData) => {
	ReactDOM.render(
		<MyHighlights
			cardData={cardData}
			username={$("body").data("username")}
		/>,
		document.getElementById("my-highlights-container")
	);
};

render(null);

const hsjson = new HearthstoneJSON();
hsjson.getLatest((data: any[]) => {
	const db = {};
	for(let i = 0; i < data.length; i++) {
		const card = data[i];
		db[''+card.dbfId] = card;
	}
	render(db);
});
