import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import MetaOverview from "../pages/MetaOverview";

UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				gameType: "RANKED_STANDARD",
				popularitySortBy: "total",
				popularitySortDirection: "descending",
				rankRange: "ALL",
				region: "ALL",
				sortBy: "popularity",
				sortDirection: "descending",
				tab: "matchups",
				timeFrame: "LAST_14_DAYS",
			}}
		>
			<MetaOverview
				cardData={cardData}
			/>
		</Fragments>,
		document.getElementById("meta-overview-container"),
	);
};

render(null);

new CardData().load(render);
