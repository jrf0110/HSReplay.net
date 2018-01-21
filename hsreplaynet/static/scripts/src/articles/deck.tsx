import React from "react";
import ReactDOM from "react-dom";
import CardList from "../components/CardList";
import CardData from "../CardData";

const container = null;
const targets = document.querySelectorAll("[class=article-card-list]");

const renderDeck = (target, deck, cardData: CardData) => {
	const dbfIds = target.getAttribute("data-cards");
	const hero = +target.getAttribute("data-hero");
	const deckClass = target.getAttribute("data-deck-class");
	const cardList = dbfIds.split(",").map(Number);
	ReactDOM.render(
		<CardList
			cardData={cardData}
			cardList={cardList}
			name=""
			showButton={true}
			heroes={[hero]}
			deckClass={deckClass}
		/>,
		target
	);
};

const render = (cardData: CardData) => {
	Array.from(targets).forEach(target => {
		renderDeck(target, null, cardData);
	});
};

new CardData().load(render);
