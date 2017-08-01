import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckDiscover from "../pages/DeckDiscover";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const container = document.getElementById("deck-discover-container");
UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				archetypes: [],
				archetypeSelector: "",
				excludedCards: [],
				gameType: "RANKED_STANDARD",
				includedCards: [],
				includedSet: "ALL",
				minGames: "1000",
				playerClasses: [],
				opponentClasses: [],
				rankRange: "ALL",
				region: "ALL",
				timeRange: "LAST_30_DAYS",
				trainingData: "",
			}}
			immutable={!UserData.isPremium() ? ["account", "timeRange", "opponentClass", "rankRange"] : null}
		>
			<DeckDiscover
				cardData={cardData}
			/>
		</Fragments>,
		container,
	);
};

render(null);

new CardData().load(render);
