import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckDetail from "../pages/DeckDetail";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const adminUrl = document.getElementById("deck-info").getAttribute("data-admin-url");
const deckId = document.getElementById("deck-info").getAttribute("data-deck-id");
const cards = document.getElementById("deck-info").getAttribute("data-deck-cards");
const deckClass = document.getElementById("deck-info").getAttribute("data-deck-class");
const user = new UserData();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				tab: "",
			}}
		>
			<DeckDetail
				adminUrl={adminUrl}
				cardData={cardData}
				deckCards={cards}
				deckClass={deckClass}
				deckId={deckId}
				user={user}
			/>
		</Fragments>,
		document.getElementById("deck-container"),
	);
};

render(null);

new CardData().load(render);
