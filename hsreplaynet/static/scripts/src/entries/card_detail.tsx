import * as React from "react";
import * as ReactDOM from "react-dom";
import {image, cardArt} from "../helpers";
import CardDetail from "../pages/CardDetail";


const cardId = document.getElementById("card-info").getAttribute("data-card-id");
const dbfId = +document.getElementById("card-info").getAttribute("data-dbf-id");
ReactDOM.render(
	<CardDetail
		cardId={cardId}
		dbfId={dbfId}
		isPremium={true}
	/>,
	document.getElementById("card-container")
);
