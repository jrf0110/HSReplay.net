import * as React from "react";
import * as _ from "lodash";
import { winrateData } from "../../helpers";
import CardData from "../../CardData";
import CardIcon from "../CardIcon";
import { Signature } from "../../pages/ArchetypeDetail";

interface DeckTileState {
	cards?: any[];
	games?: number;
	winrate?: number;
}

interface DeckTileProps extends React.ClassAttributes<DeckTile> {
	playerClass: string;
	title: string;
	cardData: CardData;
	deckData?: any;
	signature: Signature;
	archetypeId: number;
	bestProp: "winrate" | "popularity";
}

export default class DeckTile extends React.Component<DeckTileProps, DeckTileState> {
	constructor(props: DeckTileProps, state: DeckTileState) {
		super(props, state);
		this.state = {
			cards: [],
			games: 0,
			winrate: 50,
		};
	}

	componentDidMount() {
		this.updateData(this.props);
	}

	componentWillReceiveProps(nextProps: DeckTileProps) {
		if (
			!this.props.cardData && nextProps.cardData
			|| !_.isEqual(this.props.deckData, nextProps.deckData)
			|| !_.isEqual(this.props.signature, nextProps.signature)
		) {
			this.updateData(nextProps);
		}
	}

	updateData(props: DeckTileProps) {
		if (!props.deckData || !props.cardData) {
			return;
		}

		const deckData = props.deckData.series.data[props.playerClass];
		if (!deckData) {
			return;
		}

		const decks = deckData.filter((deck) => deck.archetype_id === props.archetypeId);
		if (decks.length > 0) {
			const sortProp = props.bestProp === "winrate" ? "win_rate" : "total_games";
			decks.sort((a, b) => {
				return b[sortProp] - a[sortProp] || (a.deck_id > b.deck_id ? 1 : -1);
			});

			const prevalences = this.props.signature.prevalences.slice().map(({dbfId, prevalence}) => {
				return {card: this.props.cardData.fromDbf(dbfId), prevalence};
			}).sort((a, b) => {
				return a.prevalence - b.prevalence || (a.card.name > b.card.name ? 1 : -1);
			});

			// console.log(prevalences.map((x) => x.prevalence + " " + x.card.name));

			const deckCards = JSON.parse(decks[0].deck_list).map((c) => c[0]);
			const dbfIds = [];
			prevalences.forEach(({card}) => {
				if (deckCards.indexOf(card.dbfId) !== -1 && dbfIds.length < 4) {
					dbfIds.push(card.dbfId);
				}
			});

			const cards = dbfIds.map((dbfId) => this.props.cardData.fromDbf(dbfId));

			this.setState({
				cards,
				games: decks[0].total_games,
				winrate: decks[0].win_rate,
			});
		}
	}

	render(): JSX.Element {
		const cardIcons = this.state.cards.map((card) => <CardIcon card={card} size={50}/>);
		const wrData = winrateData(50, this.state.winrate, 3);
		return (
			<div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
				<div className="tile deck-tile">
					<div className="tile-title">
						{this.props.title}
					</div>
					<div className="tile-content">
						<div className="tech-cards">
							{cardIcons}
						</div>
						<div className="stats-table">
							<table>
								<tr>
									<th>Winrate:</th>
									<td style={{color: wrData.color}}>{this.state.winrate}%</td>
								</tr>
								<tr>
									<th>Games:</th>
									<td>{this.state.games}</td>
								</tr>
							</table>
						</div>
					</div>
				</div>
			</div>
		);
	}
}
