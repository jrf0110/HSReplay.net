import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import ArchetypeDetail from "../pages/ArchetypeDetail";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import ArchetypeAnalysis from "../pages/ArchetypeAnalysis";

const container = document.getElementById("archetype-container");

const render = (cardData: CardData) => {
	ReactDOM.render(
		<ArchetypeAnalysis
			cardData={cardData}
		/>,
		container,
	);
};

render(null);

new CardData().load(render);
