import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import ArchetypeDetail from "../pages/ArchetypeDetail";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const archetypeId = document.getElementById("archetype-container").getAttribute("data-archetype-id");
const archetypeName = document.getElementById("archetype-container").getAttribute("data-archetype-name");
const playerClass = document.getElementById("archetype-container").getAttribute("data-archetype-player-class");
const user = new UserData();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				gameType: "RANKED_STANDARD",
				rankRange: "ALL",
				tab: "overview",
			}}
		>
			<ArchetypeDetail
				cardData={cardData}
				user={user}
				archetypeId={+archetypeId}
				archetypeName={archetypeName}
				playerClass={playerClass}
			/>
		</Fragments>,
		document.getElementById("archetype-container"),
	);
};

render(null);

new CardData().load(render);
