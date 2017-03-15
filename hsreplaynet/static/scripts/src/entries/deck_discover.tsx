import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckDiscover from "../pages/DeckDiscover";
import UserData from "../UserData";

const container = document.getElementById("deck-discover-container");
const userData = new UserData();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<DeckDiscover
			cardData={cardData}
			user={userData}
		/>,
		container,
	);
};

render(null);

new CardData().load(render);
