import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import ArchetypeDetail from "../pages/ArchetypeDetail";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const container = document.getElementById("archetype-container");
const archetypeId = container.getAttribute("data-archetype-id");
const archetypeName = container.getAttribute("data-archetype-name");
const playerClass = container.getAttribute("data-archetype-player-class");

UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				rankRange: "ELEVEN_THROUGH_TWENTY",
				tab: "overview",
				timeRange: "LAST_7_DAYS",
			}}
		>
			<ArchetypeDetail
				cardData={cardData}
				archetypeId={+archetypeId}
				archetypeName={archetypeName}
				playerClass={playerClass}
				hasStandardData={true}
				hasWildData={false}
				gameType="RANKED_STANDARD"
			/>
		</Fragments>,
		container,
	);
};

render(null);

new CardData().load(render);
