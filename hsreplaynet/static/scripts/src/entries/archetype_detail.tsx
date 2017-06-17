import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import ArchetypeDetail from "../pages/ArchetypeDetail";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const user = new UserData();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<Fragments
			defaults={{
				archetype: 0,
				gameType: "RANKED_STANDARD",
				rankRange: "ALL",
				tab: "overview",
			}}
		>
			<ArchetypeDetail
				cardData={cardData}
				user={user}
			/>
		</Fragments>,
		document.getElementById("archetype-container"),
	);
};

render(null);

new CardData().load(render);
