import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckDiscover from "../pages/DeckDiscover";

const mockFree = document.cookie.indexOf("free-mode") !== -1;
const premium = document.body.getAttribute("data-premium") === "1";

const container = document.getElementById("deck-discover-container");
const authenticated = container.getAttribute("data-authenticated").toLowerCase() === "true";

const render = (cardData: CardData) => {
	ReactDOM.render(
		<DeckDiscover cardData={cardData} userIsAuthenticated={authenticated} userIsPremium={premium && !mockFree}/>,
		container
	);
};

render(null);

new CardData().load(render);
