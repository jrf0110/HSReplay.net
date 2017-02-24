import * as React from "react";
import * as ReactDOM from "react-dom";
import {image, cardArt} from "../helpers";
import DeckDetail from "../pages/DeckDetail";

const mockFree = location.search.indexOf("free") !== -1;

const deckId = +document.getElementById("deck-info").getAttribute("data-deck-id");
const cards = document.getElementById("deck-info").getAttribute("data-deck-cards");
const deckClass = document.getElementById("deck-info").getAttribute("data-deck-class");
ReactDOM.render(
	<DeckDetail
		deckId={deckId}
		deckCards={cards}
		deckClass={deckClass}
		userIsPremium={!mockFree}
	/>,
	document.getElementById("deck-container")
);
