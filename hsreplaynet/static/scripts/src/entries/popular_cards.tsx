import * as React from "react";
import * as ReactDOM from "react-dom";
import PopularCards from "../pages/PopularCards";
import HearthstoneJSON from "hearthstonejson";

const mockFree = location.search.indexOf("free") !== -1;

const render = (cardData) => {
	ReactDOM.render(
		<PopularCards cardData={cardData} userIsPremium={!mockFree} />,
		document.getElementById("content-container")
	);
};

render(null);

const hsjson = new HearthstoneJSON();
hsjson.getLatest((data: any[]) => {
	const db = new Map();
	for(let i = 0; i < data.length; i++) {
		const card = data[i];
		db.set("" + card.dbfId, card);
	}
	render(db);
});
