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
				popularitySortBy: "total",
				popularitySortDirection: "descending",
				rankRange: "ALL",
				sortBy: "popularity",
				sortDirection: "descending",
				tab: "archetypes",
				timeFrame: "LAST_7_DAYS",
			}}
		>
			<MetaOverview
				cardData={cardData}
				gameType="RANKED_STANDARD"
				region="ALL"
			/>
		</Fragments>,
		document.getElementById("meta-overview-container"),
	);
};

render(null);

new CardData().load(render);
