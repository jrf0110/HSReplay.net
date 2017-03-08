import * as React from "react";
import * as ReactDOM from "react-dom";
import {image, cardArt} from "../helpers";
import CardDetail from "../pages/CardDetail";

const mockFree = document.cookie.indexOf("free-mode") !== -1;
const premium = document.body.getAttribute("data-premium") === "1";

const cardId = document.getElementById("card-info").getAttribute("data-card-id");
const dbfId = +document.getElementById("card-info").getAttribute("data-dbf-id");
ReactDOM.render(
	<CardDetail
		cardId={cardId}
		dbfId={dbfId}
		userIsPremium={premium && !mockFree}
	/>,
	document.getElementById("card-container")
);
