import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckDiscover from "../pages/DeckDiscover";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import {I18nextProvider} from "react-i18next";
import i18n from "../i18n";

const container = document.getElementById("deck-discover-container");
const user = new UserData();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<I18nextProvider i18n={i18n}>
			<Fragments
				defaults={{
					account: "",
					excludedCards: [],
					gameType: "RANKED_STANDARD",
					includedCards: [],
					includedSet: "ALL",
					playerClasses: [],
					opponentClasses: [],
					rankRange: "ALL",
					region: "ALL",
					timeRange: "LAST_30_DAYS",
				}}
				immutable={!user.isPremium() ? ["account", "timeRange", "opponentClass", "rankRange"] : null}
			>
				<DeckDiscover
					cardData={cardData}
					user={user}
				/>
			</Fragments>
		</I18nextProvider>,
		container,
	);
};

render(null);

new CardData().load(render);
