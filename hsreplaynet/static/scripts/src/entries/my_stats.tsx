import * as React from "react";
import * as ReactDOM from "react-dom";
import MyStats from "../components/MyStats";
import HearthstoneJSON from "hearthstonejson";

const render = (cardData) => {
	ReactDOM.render(
		<MyStats cardData={cardData} />,
		document.getElementById("stats-container")
	);
};

render(null);

const hsjson = new HearthstoneJSON();
hsjson.getLatest((data: any[]) => {
	const db = new Map();
	for(let i = 0; i < data.length; i++) {
		const card = data[i];
		db.set(card.id, card);
	}
	render(db);
});
