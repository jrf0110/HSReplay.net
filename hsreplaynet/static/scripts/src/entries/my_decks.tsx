import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import MyDecks from "../pages/MyDecks";

const container = document.getElementById("my-decks-container");
const user = new UserData();
const defaultAccount = user.getDefaultAccountKey();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				account: defaultAccount,
				excludedCards: [],
				gameType: "RANKED_STANDARD",
				includedCards: [],
				includedSet: "ALL",
				playerClasses: [],
			}}
			immutable={!user.isPremium() ? ["account", "timeRange", "opponentClass", "rankRange"] : null}
		>
			<MyDecks
				cardData={cardData}
				user={user}
			/>
		</Fragments>,
		container,
	);
};

render(null);

new CardData().load(render);