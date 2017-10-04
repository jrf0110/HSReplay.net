import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import Decks from "../pages/Decks";
import Fragments from "../components/Fragments";
import HSReplayNetProvider from "../components/HSReplayNetProvider";
import {getUser} from "../utils/user";

const container = document.getElementById("decks-container");
const user = getUser();

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
				immutable={!user.isPremium() ? ["account", "timeRange", "opponentClass", "rankRange", "region"] : null}
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
