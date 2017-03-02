import * as React from "react";
import * as ReactDOM from "react-dom";
import DeckSpotlight from "../pages/DeckSpotlight";
import HearthstoneJSON from "hearthstonejson";

const render = (cardData) => {
	ReactDOM.render(
		<DeckSpotlight cardData={cardData}/>,
		document.getElementById("deck-spotlight-container")
	);
};

render(null);

const hsjson = new HearthstoneJSON();
hsjson.getLatest((data: any[]) => {
	const db = new Map();
	for(let i = 0; i < data.length; i++) {
		const card = data[i];
		db.set(''+card.dbfId, card);
	}
	render(db);
});
