import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import DeckSpotlight from "../pages/DeckSpotlight";
import HSReplayNetProvider from "../components/HSReplayNetProvider";

const render = (cardData: CardData) => {
	ReactDOM.render(
		<HSReplayNetProvider>
			<DeckSpotlight cardData={cardData}/>
		</HSReplayNetProvider>,
		document.getElementById("trending-container")
	);
};

render(null);

new CardData().load(render);
