import React from "react";
import ReactDOM from "react-dom";
import CardData from "../CardData";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import Discover from "../pages/Discover";

const container = document.getElementById("discover-container");
UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				dataset: "live",
				excludedCards: [],
				format: "FT_STANDARD",
				includedCards: [],
				playerClass: "DRUID",
				tab: "decks",
			}}
			immutable={!UserData.hasFeature("archetype-training") ? ["dataset", "format"] : null}
		>
			<Discover
				cardData={cardData}
			/>
		</Fragments>,
		container,
	);
};

render(null);

new CardData().load(render);
