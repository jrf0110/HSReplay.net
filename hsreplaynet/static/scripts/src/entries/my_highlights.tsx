import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import MyHighlights from "../pages/MyHighlights";
import UserData from "../UserData";

const user = new UserData();

const render = (cardData: CardData) => {
	ReactDOM.render(
		<MyHighlights
			cardData={cardData}
			username={user.getUsername()}
		/>,
		document.getElementById("my-highlights-container")
	);
};

render(null);

new CardData().load(render);
