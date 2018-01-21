import React from "react";
import ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckSpotlight from "../pages/DeckSpotlight";

const render = (cardData: CardData) => {
	ReactDOM.render(
		<DeckSpotlight cardData={cardData}/>,
		document.getElementById("trending-container")
	);
};

render(null);

new CardData().load(render);
