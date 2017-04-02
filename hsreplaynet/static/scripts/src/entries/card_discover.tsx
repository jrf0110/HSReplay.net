import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import CardDiscover, {ViewType} from "../pages/CardDiscover";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const container = document.getElementById("card-container");
const viewType = container.getAttribute("data-view-type");
const user = new UserData();

const availableAccounts = user.getAccounts();
const defaultAccount = availableAccounts.length ? availableAccounts[0] : null;
const accountKey = defaultAccount ? defaultAccount.region + "-" + defaultAccount.lo : "-";

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				text: "",
				account: accountKey,
				showSparse: false,
				format: "",
				gameType: "RANKED_STANDARD",
				playerClass: "ALL",
				rankRange: "ALL",
				timeRange: "LAST_14_DAYS",
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
			immutable={user.isPremium() ? null : ["rankRange", "timeRange"]}
		>
			<CardDiscover
				cardData={cardData}
				user={user}
				viewType={viewType as ViewType}
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
