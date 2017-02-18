import * as React from "react";
import CardIcon from "./CardIcon";
import ManaCurve from "./ManaCurve";
import {DeckObj} from "../interfaces";
import {cardSorting, getDustCost, getHeroCardId, toTitleCase, toPrettyNumber} from "../helpers";

interface DeckTileProps extends DeckObj, React.ClassAttributes<DeckTile> {
}

export default class DeckTile extends React.Component<DeckTileProps, any> {
	
	render(): JSX.Element {
		const cards = this.props.cards || [];
		const cardIds = [];
		const cardIcons = [];
		let dustCost = 0;
		let margin = 5;

		cards.sort(cardSorting)
		
		cards.forEach(obj => {
			const card = obj.card;
			dustCost += getDustCost(card.rarity) * obj.count;
			cardIds.push(card.dbfId);
			if (obj.count > 1) {
				cardIds.push(card.dbfId);
			}
			if (cards.length > 21) {
				margin = 18;
			}
			
			const markText = card.rarity === "LEGENDARY" ? "★" : obj.count > 1 && "x" + obj.count;
			const markStyle = {
				color: "#f4d442",
				fontSize: "1em",
				right: 0,
				top: 0
			}

			cardIcons.push(
				<li style={{marginLeft: -margin}}>
					<CardIcon cardId={card.id} mark={markText} markStyle={markStyle}/>
				</li>
			)
		});

		const deckNameStyle = {
			backgroundImage: "url(/static/images/64x/class-icons/" + this.props.playerClass.toLowerCase() + ".png"
		}

		const dustCostStyle = {
			backgroundImage: "url(/static/images/dust.png"
		}
		
		return (
			<li style={{backgroundImage: "url(https://art.hearthstonejson.com/v1/256x/" + getHeroCardId(this.props.playerClass, true) + ".jpg"}}>
				<a href={"/decks/" + this.props.deckId}>
					<div>
						<div className="col-lg-2 col-md-2">
							<span className="deck-name" style={deckNameStyle}>{toTitleCase(this.props.playerClass)}</span>
							<span className="dust-cost" style={dustCostStyle}>{dustCost}</span>
						</div>
						<div className="col-lg-1 col-md-1">
							<span className="win-rate">{this.props.winrate}%</span>
							<span className="game-count">{toPrettyNumber(this.props.numGames)} games</span>
						</div>
						<div className="col-lg-1 col-md-1">
							<ManaCurve cards={this.props.cards} />
						</div>
						<div className="col-lg-8 col-md-8">
							<ul className="card-list" style={{paddingLeft: margin}}>
								{cardIcons}
							</ul>
						</div>
					</div>
				</a>
			</li>
		);
	}
}
