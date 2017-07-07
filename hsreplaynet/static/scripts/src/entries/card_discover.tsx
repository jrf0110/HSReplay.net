import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import CardDiscover, {ViewType} from "../pages/CardDiscover";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const container = document.getElementById("card-container");
let viewType = ViewType.STATISTICS;
switch (container.getAttribute("data-view-type")) {
	case "statistics":
		viewType = ViewType.STATISTICS;
		break;
	case "personal":
		viewType = ViewType.PERSONAL;
		break;
	case "cards":
		viewType = ViewType.CARDS;
		break;
}

UserData.create();
const availableAccounts = UserData.getAccounts();
const defaultAccount = UserData.getDefaultAccountKey();

if (viewType === ViewType.PERSONAL && !defaultAccount) {
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
		<Fragments
			defaults={{
				text: "",
				showSparse: false,
				format: "",
				gameType: "RANKED_STANDARD",
				playerClass: "ALL",
				rankRange: "ALL",
				timeRange: viewType === ViewType.PERSONAL ? "LAST_30_DAYS" : "LAST_14_DAYS",
				exclude: "",
				cost: [],
				rarity: [],
				set: [],
				type: [],
				race: [],
				mechanics: [],
				sortBy: "timesPlayed",
				sortDirection: "descending",
			}}
			debounce="text"
			immutable={UserData.isPremium() ? null : ["rankRange", "timeRange"]}
		>
			<CardDiscover
				cardData={cardData}
				viewType={viewType}
				accounts={availableAccounts}
			/>
		</Fragments>,
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
	if (card.overload) {
		add(card, "OVERLOAD");
	}
	if (card.referencedTags) {
		card.referencedTags.forEach((tag) => add(card, tag));
	}
};

new CardData(addMechanics).load(render);
