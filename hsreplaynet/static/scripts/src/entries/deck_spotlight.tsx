import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckSpotlight from "../pages/DeckSpotlight";
import HearthstoneJSON from "hearthstonejson";

const render = (cardData: CardData) => {
	ReactDOM.render(
		<DeckSpotlight cardData={cardData}/>,
		document.getElementById("deck-spotlight-container")
	);
};

render(null);

new CardData().load(render);
