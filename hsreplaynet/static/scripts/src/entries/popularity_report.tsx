import * as React from "react";
import * as ReactDOM from "react-dom";
import PopularityReport from "../components/reports/PopularityReport";
import HearthstoneJSON from "hearthstonejson";

const render = (cardData) => {
	ReactDOM.render(
		<PopularityReport cardData={cardData} />,
		document.getElementById("content-container")
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
