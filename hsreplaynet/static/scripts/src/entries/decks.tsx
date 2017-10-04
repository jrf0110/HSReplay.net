import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import Decks from "../pages/Decks";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import HSReplayNetProvider from "../components/HSReplayNetProvider";

const container = document.getElementById("decks-container");
UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<HSReplayNetProvider>
			<Fragments
				defaults={{
					archetypes: [],
					archetypeSelector: "",
					excludedCards: [],
					gameType: "RANKED_STANDARD",
					includedCards: [],
					includedSet: "ALL",
					playerClasses: [],
					opponentClasses: [],
					rankRange: "ALL",
					region: "ALL",
					timeRange: "LAST_30_DAYS",
					trainingData: "",
				}}
				immutable={!UserData.isPremium() ? ["account", "timeRange", "opponentClass", "rankRange", "region"] : null}
			>
				<Decks
					cardData={cardData}
					latestSet="ICECROWN"
					promoteLatestSet={false}
				/>
			</Fragments>
		</HSReplayNetProvider>,
		container,
	);
};

render(null);

new CardData().load(render);
