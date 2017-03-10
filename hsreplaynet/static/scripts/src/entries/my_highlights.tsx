import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import MyHighlights from "../pages/MyHighlights";

const render = (cardData: CardData) => {
	ReactDOM.render(
		<MyHighlights
			cardData={cardData}
			username={$("body").data("username")}
		/>,
		document.getElementById("my-highlights-container")
	);
};

render(null);

new CardData().load(render);
