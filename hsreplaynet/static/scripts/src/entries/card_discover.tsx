import * as React from "react";
import * as ReactDOM from "react-dom";
import CardDiscover, {ViewType} from "../pages/CardDiscover";
import HearthstoneJSON from "hearthstonejson";

const mockFree = document.cookie.indexOf("free-mode") !== -1;
const premium = document.body.getAttribute("data-premium") === "1";
const container = document.getElementById("card-container");
const viewType = container.getAttribute("data-view-type");

const render = (cardData) => {
	ReactDOM.render(
		<CardDiscover cardData={cardData} userIsPremium={premium && !mockFree} viewType={viewType as ViewType}/>,
		container
	);
};

render(null);

const addMechanic = (card: any, mechanic: string) => {
	if (!card.mechanics) {
		card.mechanics = [];
	}
	if(card.mechanics.indexOf(mechanic) === -1) {
		card.mechanics.push(mechanic);
	}
}

const hsjson = new HearthstoneJSON();
hsjson.getLatest((data: any[]) => {
	const db = new Map();
	for (let i = 0; i < data.length; i++) {
		const card = data[i];
		if (card.overload) {
			addMechanic(card, "OVERLOAD");
		}
		if (card.referencedTags) {
			card.referencedTags.forEach(tag => addMechanic(card, tag));
		}
		db.set(card.id, card);
	}
	render(db);
});
