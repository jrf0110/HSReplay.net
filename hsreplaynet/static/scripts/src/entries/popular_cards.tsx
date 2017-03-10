import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import HearthstoneJSON from "hearthstonejson";
import PopularCards from "../pages/PopularCards";

const mockFree = location.search.indexOf("free") !== -1;
const premium = document.body.getAttribute("data-premium") === "1";

const render = (cardData: CardData) => {
	ReactDOM.render(
		<PopularCards cardData={cardData} userIsPremium={premium && !mockFree} />,
		document.getElementById("content-container")
	);
};

render(null);

new CardData().load(render);
