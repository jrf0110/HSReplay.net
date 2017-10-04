import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import Fragments from "../components/Fragments";
import MetaOverview from "../pages/MetaOverview";
import HSReplayNetProvider from "../components/HSReplayNetProvider";
import { getUser } from "../utils/user";

const user = getUser();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<HSReplayNetProvider>
			<Fragments
				defaults={{
					gameType: "RANKED_STANDARD",
					popularitySortBy: "total",
					popularitySortDirection: "descending",
					rankRange: "ELEVEN_THROUGH_TWENTY",
					region: "ALL",
					sortBy: "popularity",
					sortDirection: "descending",
					tab: "archetypes",
					timeFrame: "LAST_7_DAYS",
				}}
				immutable={!user.isPremium() ? ["rankRange", "region", "timeFrame"] : null}
			>
				<MetaOverview
					cardData={cardData}
					region="ALL"
				/>
			</Fragments>
		</HSReplayNetProvider>,
		document.getElementById("meta-overview-container"),
	);
};

render(null);

new CardData().load(render);
