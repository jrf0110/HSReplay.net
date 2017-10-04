import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import Fragments from "../components/Fragments";
import MyDecks from "../pages/MyDecks";
import HSReplayNetProvider from "../components/HSReplayNetProvider";

const container = document.getElementById("my-decks-container");

const render = (cardData: CardData) => {
	ReactDOM.render(
		<HSReplayNetProvider>
			<Fragments
				defaults={{
					excludedCards: [],
					gameType: "RANKED_STANDARD",
					includedCards: [],
					includedSet: "ALL",
					timeRange: "LAST_30_DAYS",
					playerClasses: [],
				}}
			>
				<MyDecks
					cardData={cardData}
				/>
			</Fragments>
		</HSReplayNetProvider>,
		container,
	);
};

render(null);

new CardData().load(render);
