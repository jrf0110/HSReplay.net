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
const heroDbfId = +document.getElementById("deck-info").getAttribute("data-hero-id");
const archetypeId = document.getElementById("deck-info").getAttribute("data-archetype-id");
const archetypeName = document.getElementById("deck-info").getAttribute("data-archetype-name");
UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				gameType: "RANKED_STANDARD",
				rankRange: "ALL",
				region: "ALL",
				selectedClasses: [],
				tab: "breakdown",
			}}
			immutable={!UserData.isPremium() ? ["selectedClasses", "rankRange", "region"] : null}
		>
			<DeckDetail
				adminUrl={adminUrl}
				archetypeId={archetypeId}
				archetypeName={archetypeName}
				cardData={cardData}
				deckCards={cards}
				deckClass={deckClass}
				deckId={deckId}
				heroDbfId={heroDbfId}
			/>
		</Fragments>,
		document.getElementById("deck-container"),
	);
};

render(null);

new CardData().load(render);
