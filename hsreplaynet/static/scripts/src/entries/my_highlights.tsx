import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import MyHighlights from "../pages/MyHighlights";
import UserData from "../UserData";
import HSReplayNetProvider from "../components/HSReplayNetProvider";

UserData.create();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<HSReplayNetProvider>
			<MyHighlights
				cardData={cardData}
			/>
		</HSReplayNetProvider>,
		document.getElementById("my-highlights-container"),
	);
};

render(null);

new CardData().load(render);
