import React from "react";
import ReactDOM from "react-dom";
import CardData from "../CardData";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import MyDecks from "../pages/MyDecks";

const container = document.getElementById("my-decks-container");
UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				excludedCards: [],
				gameType: "RANKED_STANDARD",
				includedCards: [],
				includedSet: "ALL",
				timeRange: "LAST_30_DAYS",
				playerClasses: []
			}}
		>
			<MyDecks cardData={cardData} />
		</Fragments>,
		container
	);
};

render(null);

new CardData().load(render);
