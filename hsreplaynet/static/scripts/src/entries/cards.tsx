import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import Cards from "../pages/Cards";
import Fragments from "../components/Fragments";
import HSReplayNetProvider from "../components/HSReplayNetProvider";
import {getUser} from "../utils/user";

const container = document.getElementById("card-container");
const personal = container.getAttribute("data-view-type") === "personal";

const user = getUser();

if (personal && !user.getDefaultAccountKey()) {
	if (typeof ga === "function") {
		ga("send", {
			hitType: "event",
			eventCategory: "Pegasus Account",
			eventAction: "missing",
			eventLabel: "My Cards",
			nonInteraction: true,
		});
	}
}

const render = (cardData: CardData) => {
	ReactDOM.render(
		<HSReplayNetProvider>
			<Fragments
				defaults={{
					text: "",
					showSparse: false,
					format: "",
					gameType: "RANKED_STANDARD",
					playerClass: "ALL",
					rankRange: "ALL",
					timeRange: personal ? "LAST_30_DAYS" : "LAST_14_DAYS",
					exclude: "",
					cost: [],
					rarity: [],
					set: [],
					type: [],
					race: [],
					mechanics: [],
					sortBy: "timesPlayed",
					sortDirection: "descending",
					display: "statistics",
					uncollectible: "",
				}}
				debounce="text"
				immutable={user.isPremium() ? null : ["rankRange", "timeRange"]}
			>
				<Cards
					cardData={cardData}
					personal={personal}
					accounts={user.getAccounts()}
				/>
			</Fragments>
		</HSReplayNetProvider>,
		container,
	);
};

render(null);

const addMechanics = (card: any) => {
	const add = (card: any, mechanic: string) => {
		if (!card.mechanics) {
			card.mechanics = [];
		}
		if (card.mechanics.indexOf(mechanic) === -1) {
			card.mechanics.push(mechanic);
		}
	};
	if (card.referencedTags) {
		card.referencedTags.forEach((tag) => add(card, tag));
	}
};

new CardData(addMechanics).load(render);
