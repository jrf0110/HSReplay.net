import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import CardDiscover, {ViewType} from "../pages/CardDiscover";
import HearthstoneJSON from "hearthstonejson";

const mockFree = document.cookie.indexOf("free-mode") !== -1;
const premium = document.body.getAttribute("data-premium") === "1";
const container = document.getElementById("card-container");
const viewType = container.getAttribute("data-view-type");

const render = (cardData: CardData) => {
	ReactDOM.render(
		<CardDiscover
			cardData={cardData}
			userIsPremium={premium && !mockFree}
			viewType={viewType as ViewType}
		/>,
		container
	);
};

render(null);

const addMechanics = (card: any) => {
	const add = (card: any, mechanic: string) => {
		if (!card.mechanics) {
			card.mechanics = [];
		}
		if(card.mechanics.indexOf(mechanic) === -1) {
			card.mechanics.push(mechanic);
		}
	}
	if (card.overload) {
		add(card, "OVERLOAD");
	}
	if (card.referencedTags) {
		card.referencedTags.forEach(tag => add(card, tag));
	}
}

new CardData(addMechanics).load(render);
