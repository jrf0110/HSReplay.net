import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import CardDetail from "../pages/CardDetail";

const mockFree = document.cookie.indexOf("free-mode") !== -1;
const premium = document.body.getAttribute("data-premium") === "1";

const cardId = document.getElementById("card-info").getAttribute("data-card-id");
const dbfId = +document.getElementById("card-info").getAttribute("data-dbf-id");

const render = (cardData: CardData) => {
	const card = cardData && cardData.fromDbf(dbfId);
	ReactDOM.render(
		<CardDetail
			card={card}
			cardData={cardData}
			cardId={cardId}
			dbfId={dbfId}
			userIsPremium={premium && !mockFree}
		/>,
		document.getElementById("card-container")
	);
}

render(null);

new CardData().load(render);
