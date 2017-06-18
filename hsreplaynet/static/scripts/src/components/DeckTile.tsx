import * as React from "react";
import CardIcon from "./CardIcon";
import ManaCurve from "./ManaCurve";
import moment from "moment";
import {CardObj, DeckObj} from "../interfaces";
import { cardSorting, getFragments, getHeroCardId, toPrettyNumber, toTitleCase } from "../helpers";
import DataInjector from "./DataInjector";
import ArchetypeSelector from "./ArchetypeSelector";
import UserData from "../UserData";
import DataManager from "../DataManager";

interface DeckTileProps extends DeckObj, React.ClassAttributes<DeckTile> {
	dustCost?: number;
	compareWith?: CardObj[];
	showArchetypeSelector?: boolean;
	user?: UserData;
	dataManager?: DataManager;
}

export default class DeckTile extends React.Component<DeckTileProps, any> {

	render(): JSX.Element {
		const cards = this.props.cards || [];
		const cardIcons = [];

		if (this.props.compareWith) {
			const removed = this.props.compareWith.filter((c1) => cards.every((c2) => c2.card.id !== c1.card.id));
			removed.forEach((c) => cards.push({card: c.card, count: 0}));
		}

		cards.sort(cardSorting);

		cards.forEach((obj, index: number) => {
			const card = obj.card;
			let markText = obj.count ? (card.rarity === "LEGENDARY" ? "★" : obj.count > 1 && "x" + obj.count) : null;
			const markStyle = {
				color: "#f4d442",
				fontSize: "1em",
				right: 0,
				top: 0,
			};

			let itemClassName = null;
			if (this.props.compareWith) {
				const comparisonCard = this.props.compareWith.find((c) => c.card.id === card.id);
				if (obj.count === 0) {
					itemClassName = "removed";
					markText = "" + -comparisonCard.count;
				}
				else {
					if (!comparisonCard || comparisonCard.count < obj.count) {
						itemClassName = "added";
						markText = "+" + (obj.count - (comparisonCard ? comparisonCard.count : 0));
					}
					else if (comparisonCard.count > obj.count) {
						itemClassName = "reduced";
						markText = "" + (obj.count - comparisonCard.count);
					}
					else {
						itemClassName = "unchanged";
					}
				}
			}

			cardIcons.push(
				<li className={itemClassName} key={this.props.compareWith ? index : obj.count + "x " + card.id}>
					<CardIcon
						card={card}
						mark={markText}
						markStyle={markStyle}
						tabIndex={-1}
					/>
				</li>,
			);
		});

		const deckNameStyle = {
			backgroundImage: "url(/static/images/64x/class-icons/" + this.props.playerClass.toLowerCase() + ".png)",
		};

		const dustCost = typeof this.props.dustCost === "number" ? this.props.dustCost : null;

		const dustCostStyle = {
			backgroundImage: "url(/static/images/dust.png)",
		};

		let deckName = null;
		if (this.props.showArchetypeSelector && this.props.user
			&& this.props.dataManager && this.props.user.hasFeature("archetype-selection")) {
			deckName = (
				<DataInjector
					dataManager={this.props.dataManager}
					query={[
						{key: "archetypeData", url: "/api/v1/archetypes/", params: {}},
						{key: "deckData", url: "/api/v1/decks/" + this.props.deckId, params: {}},
					]}
				>
					<ArchetypeSelector playerClass={this.props.playerClass}/>
				</DataInjector>
			);
		}
		else {
			deckName = (
				<span className="deck-name" style={deckNameStyle}>
					{toTitleCase(this.props.playerClass)}
				</span>
			);
		}

		return (
			<li
				style={{
					backgroundImage: "url(https://art.hearthstonejson.com/v1/256x/"
						+ getHeroCardId(this.props.playerClass, true) + ".jpg)",
				}}
			>
				<a href={"/decks/" + this.props.deckId + "/" + getFragments(["gameType", "rankRange"])}>
					<div>
						<div className="col-lg-2 col-md-2 col-sm-2 col-xs-6">
							{deckName}
							{dustCost !== null ? <span className="dust-cost" style={dustCostStyle}>{this.props.dustCost}</span> : null}
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
