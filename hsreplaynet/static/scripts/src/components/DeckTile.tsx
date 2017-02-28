import * as React from "react";
import CardIcon from "./CardIcon";
import ManaCurve from "./ManaCurve";
import moment from "moment";
import {CardObj, DeckObj} from "../interfaces";
import {cardSorting, getDustCost, getHeroCardId, toTitleCase, toPrettyNumber} from "../helpers";

interface DeckTileProps extends DeckObj, React.ClassAttributes<DeckTile> {
	compareWith?: CardObj[];
}

export default class DeckTile extends React.Component<DeckTileProps, any> {
	
	render(): JSX.Element {
		const cards = this.props.cards || [];
		const cardIcons = [];
		let dustCost = 0;

		if (this.props.compareWith) {
			const removed = this.props.compareWith.filter(c1 => cards.every(c2 => c2.card.id !== c1.card.id));
			removed.forEach(c => cards.push({card: c.card, count: 0}));
		}

		cards.sort(cardSorting)

		cards.forEach(obj => {
			const card = obj.card;
			dustCost += getDustCost(card) * obj.count;
			
			const markText = obj.count ? (card.rarity === "LEGENDARY" ? "★" : obj.count > 1 && "x" + obj.count) : null;
			const markStyle = {
				color: "#f4d442",
				fontSize: "1em",
				right: 0,
				top: 0
			};

			let itemClassName = null;
			if (this.props.compareWith) {
				if (obj.count === 0) {
					itemClassName = "removed";
				}
				else {
					const comparisonCard = this.props.compareWith.find(c => c.card.id === card.id);
					if (!comparisonCard || comparisonCard.count < obj.count) {
						itemClassName = "added"
					}
					else if (comparisonCard.count > obj.count) {
						itemClassName = "reduced";
					}
					else {
						itemClassName = "unchanged";
					}
				}
			}

			cardIcons.push(
				<li className={itemClassName}>
					<CardIcon cardId={card.id} dbfId={card.dbfId} mark={markText} markStyle={markStyle}/>
				</li>
			);
		});

		const deckNameStyle = {
			backgroundImage: "url(/static/images/64x/class-icons/" + this.props.playerClass.toLowerCase() + ".png"
		};

		const dustCostStyle = {
			backgroundImage: "url(/static/images/dust.png"
		};
		
		return (
			<li style={{backgroundImage: "url(https://art.hearthstonejson.com/v1/256x/" + getHeroCardId(this.props.playerClass, true) + ".jpg"}}>
				<a href={"/decks/" + this.props.deckId}>
					<div>
						<div className="col-lg-2 col-md-2 col-sm-2 col-xs-6">
							<span className="deck-name" style={deckNameStyle}>{toTitleCase(this.props.playerClass)}</span>
							<span className="dust-cost" style={dustCostStyle}>{dustCost}</span>
						</div>
						<div className="col-lg-1 col-md-1 col-sm-1 col-xs-3">
							<span className="win-rate">{(+this.props.winrate).toFixed(1)}%</span>
						</div>
						<div className="col-lg-1 col-md-1 col-sm-1 col-xs-3">
							<span className="game-count">{toPrettyNumber(this.props.numGames)}</span>
						</div>
						<div className="col-lg-1 col-md-1 hidden-sm hidden-xs">
							<div className="duration" title="Average game length">
								<span className="glyphicon glyphicon-time" />
								{" " + moment.duration(this.props.duration, "seconds").asMinutes().toFixed(1) + " min"}
							</div>
						</div>
						<div className="col-lg-1 hidden-md hidden-sm hidden-xs">
							<ManaCurve cards={this.props.cards} />
						</div>
						<div className="col-lg-6 col-md-7 col-sm-8 hidden-xs">
							<ul className="card-list">
								{cardIcons}
							</ul>
						</div>
					</div>
				</a>
			</li>
		);
	}
}
