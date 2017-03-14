import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckDetail from "../pages/DeckDetail";

const mockFree = document.cookie.indexOf("free-mode") !== -1;
const premium = document.body.getAttribute("data-premium") === "1";
const authenticated = !!document.body.getAttribute("data-username");

const deckId = +document.getElementById("deck-info").getAttribute("data-deck-id");
const cards = document.getElementById("deck-info").getAttribute("data-deck-cards");
const deckClass = document.getElementById("deck-info").getAttribute("data-deck-class");

const render = (cardData: CardData) => {
	ReactDOM.render(
		<DeckDetail
			cardData={cardData}
			deckCards={cards}
			deckClass={deckClass}
			deckId={deckId}
			userIsPremium={premium && !mockFree}
			userIsAuthenticated={authenticated}
		/>,
		document.getElementById("deck-container"),
	);
};

render(null);

new CardData().load(render);
