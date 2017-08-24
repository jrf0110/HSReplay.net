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
const hasStandardData = container.getAttribute("data-archetype-standard").toLowerCase() === "true";
const hasWildData = container.getAttribute("data-archetype-wild").toLowerCase() === "true";

UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				rankRange: "ALL",
				tab: "overview",
			}}
		>
			<ArchetypeDetail
				cardData={cardData}
				archetypeId={+archetypeId}
				archetypeName={archetypeName}
				playerClass={playerClass}
				hasStandardData={hasStandardData}
				hasWildData={hasWildData}
				gameType="RANKED_STANDARD"
			/>
		</Fragments>,
		container,
	);
};

render(null);

new CardData().load(render);
