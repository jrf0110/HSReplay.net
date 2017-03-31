import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckDiscover from "../pages/DeckDiscover";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const container = document.getElementById("deck-discover-container");
const user = new UserData();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				excludedCards: "",
				gameType: "RANKED_STANDARD",
				includedCards: "",
				opponentClass: "ALL",
				personal: "",
				playerClass: "ALL",
				rankRange: "ALL",
				region: "ALL",
				sortBy: "popularity",
				sortDirection: "descending",
				timeRange: "LAST_30_DAYS",
			}}
			immutable={!user.isPremium() ? ["timeRange", "opponentClass", "rankRange"] : null}
		>
			<DeckDiscover
				cardData={cardData}
				user={user}
			/>
		</Fragments>,
		container,
	);
};

render(null);

new CardData().load(render);
