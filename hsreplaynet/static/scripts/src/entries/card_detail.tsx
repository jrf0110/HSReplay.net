import * as React from "react";
import * as ReactDOM from "react-dom";
import CardData from "../CardData";
import CardDetail from "../pages/CardDetail";
import UserData from "../UserData";
import Fragments from "../components/Fragments";

const cardId = document.getElementById("card-info").getAttribute("data-card-id");
const dbfId = +document.getElementById("card-info").getAttribute("data-dbf-id");
const user = new UserData();

const render = (cardData: CardData) => {
	const card = cardData && cardData.fromDbf(dbfId);
	ReactDOM.render(
		<Fragments
			defaults={{
				gameType: "RANKED_STANDARD",
				opponentClass: "ALL",
				tab: "recommended-decks",
			}}
			immutable={!user.isPremium() ? "opponentClass" : null}
		>
			<CardDetail
				card={card}
				cardData={cardData}
				cardId={cardId}
				dbfId={dbfId}
				userData={user}
			/>
		</Fragments>,
		document.getElementById("card-container"),
	);
};

render(null);

new CardData().load(render);
