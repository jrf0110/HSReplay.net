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
				ascending: "true",
				sortBy: "popularity",
				gameType: "RANKED_STANDARD",
				rankRange: "ALL",
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
